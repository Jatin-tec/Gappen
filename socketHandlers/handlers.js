function registerSocketEvents(io, socket, client) {
    socket.on("join", (userName) => {
        const queueName = Math.random() < 0.5 ? 'waitingUsersA' : 'waitingUsersB';
        addUserToWaitingList(socket, queueName, userName, client);
        attemptToMatchUsers(io, queueName, client);
    });

    socket.on("ice-candidate", async (candidate, roomName) => {
        const room = await client.get(roomName);
        const roomData = JSON.parse(room);

        if (socket.id === roomData.offerSocketId) {
            roomData.offerIceCandidates.push(candidate);
            await client.set(roomName, JSON.stringify(roomData));
            socket.to(roomData.answerSocketId).emit("ice-candidate", candidate);
        }
        if (socket.id === roomData.answerSocketId) {
            roomData.answerIceCandidates.push(candidate);
            await client.set(roomName, JSON.stringify(roomData));
            socket.to(roomData.offerSocketId).emit("ice-candidate", candidate);
        }
    });

    socket.on("offer", async (offer, roomName) => {
        let room = await client.get(roomName);
        room = JSON.parse(room);
        room.offer = offer;
        console.log(room);
        await client.set(roomName, JSON.stringify(room));
        socket.to(room.answerSocketId).emit("offer", room, roomName);
    });

    socket.on("answer", async (answer, roomName, ackFunction) => {
        let room = await client.get(roomName);
        room = JSON.parse(room);
        room.answer = answer;
        console.log(room);
        await client.set(roomName, JSON.stringify(room));
        ackFunction(room.offerIceCandidates);
        socket.to(room.offerSocketId).emit("answer", room, roomName);
    });

    socket.on("set-answer-ice", async (roomName, ackFunction) => {
        let room = await client.get(roomName);
        room = JSON.parse(room);
        ackFunction(room.answerIceCandidates);
    })

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

        async function removeUserFromWaitingList(queueName) {
            const members = await client.sMembers(queueName);
            for (const member of members) {
                const data = JSON.parse(member);
                if (data.socketId === socket.id) {
                    await client.sRem(queueName, member);
                    return true; // User was found and removed
                }
            }
            return false; // User was not found in this queue
        }
    
        const wasInQueueA = await removeUserFromWaitingList('waitingUsersA');
        const wasInQueueB = await removeUserFromWaitingList('waitingUsersB');
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

    await client.sAdd(queueName, JSON.stringify({"userName": userName, "socketId": socket.id}));
    const waitingUsers = await client.sCard(queueName);

    console.log(`User ${socket.id} added to waiting list ${queueName}. Waiting users: ${waitingUsers}`);
}

async function attemptToMatchUsers(io, queueName, client) {
    while (await client.sCard(queueName) >= 2) {

        let user1 = await client.sPop(queueName);
        let user2 = await client.sPop(queueName);

        user1 = JSON.parse(user1);
        user2 = JSON.parse(user2);

        const roomName = `room-${user1.socketId}-${user2.socketId}`;

        await client.set(roomName, JSON.stringify({
            offererUserName: user1,
            offer: null,
            offerSocketId: user1.socketId,
            offerIceCandidates: [],
            answererUserName: user2,
            answer: null,
            answerSocketId: user2.socketId,
            answerIceCandidates: []
        }));
    
        const user1Socket = io.sockets.sockets.get(user1.socketId);
        const user2Socket = io.sockets.sockets.get(user2.socketId);

        if (user1Socket && user2Socket) {
            user1Socket.join(roomName);
            user2Socket.join(roomName);

            console.log(`Matched ${user1.userName} with ${user2.userName} in room ${roomName}`);
            user2Socket.emit("create-pear", user1.userName, roomName);
            user1Socket.emit("create-offer", user2.userName, roomName);
        }
    }
}

module.exports = { registerSocketEvents };
