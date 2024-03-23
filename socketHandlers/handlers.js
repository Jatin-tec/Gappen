const waitingUsersA = 'waitingUsersA';
const waitingUsersB = 'waitingUsersB';

const redisUtils = {
    async addUserToQueue(client, queueName, userName, socketId) {
        const userData = JSON.stringify({ userName, socketId });
        await client.sAdd(queueName, userData);
        const waitingUsersCount = await client.sCard(queueName);
        console.log(`User ${socketId} added to ${queueName}. Waiting users: ${waitingUsersCount}`);
    },

    async createRoomForUsers(client, user1Data, user2Data) {
        const roomName = `room-${user1Data.socketId}-${user2Data.socketId}`;
        const roomData = {
            offerer: user1Data,
            answerer: user2Data,
            offer: null,
            offerIceCandidates: [],
            answer: null,
            answerIceCandidates: [],
        };
        await client.set(roomName, JSON.stringify(roomData));
        await client.set(user1Data.socketId, JSON.stringify({ roomName, userName: user1Data.userName }));
        await client.set(user2Data.socketId, JSON.stringify({ roomName, userName: user2Data.userName }));
        return { roomName, roomData };
    },

    async matchUsersFromQueue(client, io, queueName) {
        while (await client.sCard(queueName) >= 2) {
            let [user1Data, user2Data] = await Promise.all([client.sPop(queueName), client.sPop(queueName)]);
            user1Data = JSON.parse(user1Data);
            user2Data = JSON.parse(user2Data);

            const { roomName } = await this.createRoomForUsers(client, user1Data, user2Data);
            const user1Socket = io.sockets.sockets.get(user1Data.socketId);
            const user2Socket = io.sockets.sockets.get(user2Data.socketId);

            if (user1Socket && user2Socket) {
                user1Socket.join(roomName);
                user2Socket.join(roomName);
                user2Socket.emit("create-peer", user1Data.userName, roomName);
                user1Socket.emit("create-offer", user2Data.userName, roomName);
            }

            console.log(`Matched users ${user1Data.socketId} and ${user2Data.socketId} in room ${roomName}`);
        }
    },

    async removeUserFromWaitingLists(client, socketId) {
        const queues = [waitingUsersA, waitingUsersB];
        for (const queueName of queues) {
            const members = await client.sMembers(queueName);
            for (const member of members) {
                console.log(`Checking member: ${member}`);
                const data = JSON.parse(member);
                if (data.socketId === socketId) {
                    await client.sRem(queueName, member);
                    console.log(`Removed user ${socketId} from ${queueName}`);
                    return; // Assuming a user can only be in one queue at a time
                }
            }
        }
    }
};

function registerSocketEvents(io, socket, client) {
    socket.on("join", userName => {
        const queueName = Math.random() < 0.5 ? waitingUsersA : waitingUsersB;
        redisUtils.addUserToQueue(client, queueName, userName, socket.id);
        redisUtils.matchUsersFromQueue(client, io, queueName);
    });

    // Handle ICE candidates
    socket.on("ice-candidate", async (candidate, roomName) => {
        try {
            const roomData = JSON.parse(await client.get(roomName));
            if (!roomData || !roomData.offerer || !roomData.answerer) {
                console.error(`Room data is incomplete for room: ${roomName}`);
                return; // Exit early if room data is incomplete
            }
            const targetSocketId = socket.id === roomData.offerer.socketId ? roomData.answerer.socketId : roomData.offerer.socketId;
            roomData[socket.id === roomData.offerer.socketId ? "offerIceCandidates" : "answerIceCandidates"].push(candidate);
            await client.set(roomName, JSON.stringify(roomData));
            socket.to(targetSocketId).emit("ice-candidate", candidate);
        } catch (error) {
            console.error(`Error handling ice-candidate event: ${error}`);
        }
    });

    // Offer and Answer handlers simplified with an example of the offer handler
    socket.on("offer", async (offer, roomName) => handleSessionDescription(offer, roomName, 'offer', client, socket));

    socket.on("answer", async (answer, roomName, ackFunction) => handleSessionDescription(answer, roomName, 'answer', client, socket, ackFunction));

    socket.on("send-message", (message, roomName) => {
        console.log(`Message from ${socket.id} in room ${roomName}: ${message}`);
        const receiverId = roomName.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '').replace(`room-`, '');
        console.log(`Sending message to ${receiverId}`);
        socket.to(receiverId).emit("receive-message", message);
    });

    socket.on("skip", async () => {
        const userObj = JSON.parse(await client.get(socket.id));
        if (!userObj) return; // Early return if user data is not found

        const oldRoomName = userObj.roomName;
        console.log(`Old room: ${oldRoomName}`);

        if (oldRoomName) {
            socket.leave(oldRoomName);
            io.to(oldRoomName).emit("userSkipped", socket.id); // Notify the other user in the room

            // Clean up Redis entries for the room and the skipping user
            await client.del(socket.id);
            await client.del(oldRoomName);

            // Extract the ID of the other user in the room
            const otherSocketId = oldRoomName.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '');
            const otherSocket = io.sockets.sockets.get(otherSocketId);

            // Re-add both users to waiting lists for a new match
            const queueNameForCurrentUser = Math.random() < 0.5 ? waitingUsersA : waitingUsersB;
            redisUtils.addUserToQueue(client, queueNameForCurrentUser, userObj.userName, socket.id);
            redisUtils.matchUsersFromQueue(client, io, queueNameForCurrentUser);

            if (otherSocket) {
                // Handle the other user similarly: clean up and re-queue for matching
                const otherUserObj = JSON.parse(await client.get(otherSocketId));
                await client.del(otherSocketId); // Clean up Redis entry for the other user

                const queueNameForOtherUser = queueNameForCurrentUser === waitingUsersA ? waitingUsersB : waitingUsersA;
                if (otherUserObj && otherUserObj.userName) {
                    redisUtils.addUserToQueue(client, queueNameForOtherUser, otherUserObj.userName, otherSocketId);
                    redisUtils.matchUsersFromQueue(client, io, queueNameForOtherUser);
                }
            }
        }
    });

    // Disconnect event handler
    socket.on("disconnect", async () => {
        console.log(`User disconnected: ${socket.id}`);

        // Remove the user from the waiting list, if present
        await redisUtils.removeUserFromWaitingLists(client, socket.id);

        const userObjStr = await client.get(socket.id);
        if (!userObjStr) {
            console.log(`No user object found for socket ID: ${socket.id}`);
            return;
        }
        const userObj = JSON.parse(userObjStr);
        const oldRoomName = userObj.roomName;

        console.log(`Old room: ${oldRoomName}`);

        // If the user was in a room, handle additional cleanup
        if (oldRoomName) {
            // Notify the other user in the room that their partner has disconnected
            const otherSocketId = oldRoomName.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '');
            io.to(otherSocketId).emit("partnerDisconnected");

            const otherSocket = io.sockets.sockets.get(otherSocketId);
            if (otherSocket) {
                otherSocket.leave(oldRoomName);
                // Optionally, re-add the remaining user to a waiting list for a new match
                const otherUserObjStr = await client.get(otherSocketId);
                if (otherUserObjStr) {
                    const otherUserObj = JSON.parse(otherUserObjStr);
                    const queueNameForOtherUser = Math.random() < 0.5 ? 'waitingUsersA' : 'waitingUsersB';
                    redisUtils.addUserToQueue(client, queueNameForOtherUser, otherUserObj.userName, otherSocketId);
                    redisUtils.matchUsersFromQueue(client, io, queueNameForOtherUser);
                }
            }

            // Clean up room and user entries in Redis
            await client.del(oldRoomName);
        }

        // Removing the disconnecting user's Redis entry
        await client.del(socket.id);
    });
}

async function handleSessionDescription(description, roomName, type, client, socket, ackFunction = null) {
    let room = JSON.parse(await client.get(roomName));
    room[type] = description;
    await client.set(roomName, JSON.stringify(room));
    const targetSocketId = type === 'offer' ? room.answerer.socketId : room.offerer.socketId;
    if (ackFunction) ackFunction(room[`${type}IceCandidates`]);
    socket.to(targetSocketId).emit(type, description, roomName);
}

module.exports = { registerSocketEvents };
