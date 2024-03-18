function registerSocketEvents(io, socket, client) {
    socket.on("join", (userName) => {
        const queueName = Math.random() < 0.5 ? 'waitingUsersA' : 'waitingUsersB';
        addUserToWaitingList(socket, queueName, userName, client);
        attemptToMatchUsers(io, queueName, client);
    });

    socket.on("ice-candidate", async (candidate, roomName) => {
        console.log(`Received ICE candidate from ${socket.id} in room ${roomName}`);
        const reciverId = roomName.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '').replace('room-' , '');
        
        // store the candidate for later use in redis
        const iceCandidatesKey = `iceCandidates:${socket.id}`;
        try {
            await client.rPush(iceCandidatesKey, JSON.stringify(candidate));
            const candidates = await client.lRange(iceCandidatesKey, 0, -1);
            console.log(`Stored candidate for ${socket.id}:`, candidate, candidates);
        } catch (err) {
            console.error(`Error storing ICE candidate: ${err}`);
        }
        socket.to(reciverId).emit("ice-candidate", candidate);
    });

    socket.on("offer", async (offer, roomName) => {
        const reciverId = roomName.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '').replace('room-' , '');
        console.log(`Sending offer to ${reciverId}`);
        
        const candidateQueue = await waitForAtLeastOneCandidate();
        const candidate = candidateQueue.map(candidate => JSON.parse(candidate));

        console.log(`Candidate queue`, candidate, socket.id);

        socket.to(reciverId).emit("offer", offer, roomName, candidate);
    });

    async function waitForAtLeastOneCandidate(interval = 1000, timeout = 30000) {
        const iceCandidatesKey = `iceCandidates:${socket.id}`
        let totalTime = 0;
    
        return new Promise((resolve, reject) => {
            const checkList = async () => {
                try {
                    const candidates = await client.lRange(iceCandidatesKey, 0, -1);
                    if (candidates.length > 0) {
                        resolve(candidates); // Resolve with the candidates
                    } else if (totalTime < timeout) {
                        totalTime += interval;
                        setTimeout(checkList, interval); // Check again after the interval
                    } else {
                        reject(new Error('Timeout waiting for candidates'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            checkList();
        });
    }    

    socket.on("answer", async (answer, roomName) => {
        const reciverId = roomName.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '').replace('room-' , '');

        const candidateQueue = await waitForAtLeastOneCandidate();
        const candidate = candidateQueue.map(candidate => JSON.parse(candidate));

        socket.to(reciverId).emit("answer", answer, candidate);
    });

    socket.on("send-message", (message, roomId) => {
        console.log(`User ${socket.id} sent message: ${message}`);
        const reciverId = roomId.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '').replace('room-' , '');
        console.log(`Sending message to ${reciverId}`);
        socket.to(reciverId).emit("receive-message", message);
    });

    socket.on("skip", async () => {
        const oldRoom = await client.get(`room:${socket.id}`);
        console.log(`Old room: ${oldRoom}`);
        if (oldRoom) {
            socket.leave(oldRoom);
            io.to(oldRoom).emit("userSkipped", socket.id); // Notify the other user

            // Determine the other user in the room
            const otherSocketId = oldRoom.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '').replace('room-' , '');
            const otherSocket = io.sockets.sockets.get(otherSocketId);

            // Remove users from their current queues and rooms
            await client.sRem('waitingUsersA', socket.id);
            await client.sRem('waitingUsersB', socket.id);
            await client.del(`room:${socket.id}`);

            if (otherSocket) {
                await client.del(`room:${otherSocketId}`);
                
                const userName = await client.get(`user:${socket.id}`);
                const otherUserName = await client.get(`user:${otherSocketId}`);
                // Re-add users to the waiting lists for a new match
                await addUserToWaitingList(socket, 'waitingUsersA', userName, client);
                await addUserToWaitingList(otherSocket, 'waitingUsersB', otherUserName, client);

                // Attempt to match both users in their respective new queues
                attemptToMatchUsers(io, 'waitingUsersB', client);
            }
            attemptToMatchUsers(io, 'waitingUsersA', client);
        }
    });

    socket.on("disconnect", async () => {
        console.log(`User disconnected: ${socket.id}`);

        // Remove the user from any waiting list they might be in and their room
        const wasInQueueA = await client.sRem('waitingUsersA', socket.id);
        const wasInQueueB = await client.sRem('waitingUsersB', socket.id);
        const oldRoom = await client.get(`room:${socket.id}`);

        if (oldRoom) {
            const otherSocketId = oldRoom.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '').replace('room-' , '');
            const otherSocket = io.sockets.sockets.get(otherSocketId);
            const userName = await client.get(`user:${socket.id}`);
            if (otherSocket) {
                otherSocket.leave(oldRoom);
                // Notify the other user in the room that their partner has disconnected
                io.to(otherSocket.id).emit("partnerDisconnected");
                // Optionally, move the remaining user to a waiting list for re-matching
                const newQueue = wasInQueueA ? 'waitingUsersB' : 'waitingUsersA'; // Switch queue if the user was in one
                await addUserToWaitingList(otherSocket, newQueue, userName, client);
                attemptToMatchUsers(io, newQueue, client);
            }
            // Clean up room mappings
            await client.del(`room:${socket.id}`);
            await client.del(`username:${socket.id}`);
            if (otherSocketId) {
                await client.del(`room:${otherSocketId}`);
            }
        }

        // Attempt to match users in the remaining queue
        const queueToMatch = wasInQueueA > 0 ? 'waitingUsersA' : 'waitingUsersB';
        if (wasInQueueA > 0 || wasInQueueB > 0) {
            attemptToMatchUsers(io, queueToMatch, client);
        }
    });
}

async function addUserToWaitingList(socket, queueName, userName, client) {
    await client.sAdd(queueName, socket.id);
    if (!client.get(`user:${socket.id}`)) {
        await client.set(`user:${socket.id}`, userName);
    }
    const waitingUsers = await client.sCard(queueName);
    console.log(`User ${socket.id} added to waiting list ${queueName}. Waiting users: ${waitingUsers}`);
}

async function attemptToMatchUsers(io, queueName, client) {
    while (await client.sCard(queueName) >= 2) {
        const user1Id = await client.sPop(queueName);
        const user2Id = await client.sPop(queueName);

        const roomName = `room-${user1Id}-${user2Id}`;
        await client.set(`room:${user1Id}`, roomName);
        await client.set(`room:${user2Id}`, roomName);

        const user1Socket = io.sockets.sockets.get(user1Id);
        const user2Socket = io.sockets.sockets.get(user2Id);

        if (user1Socket && user2Socket) {
            user1Socket.join(roomName);
            user2Socket.join(roomName);

            io.to(roomName).emit("roomJoined", roomName);
            console.log(`Users ${user1Id} and ${user2Id} joined room ${roomName}`);
        }
    }
}

module.exports = { registerSocketEvents };
