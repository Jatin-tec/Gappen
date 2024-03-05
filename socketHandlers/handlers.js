const redis = require('redis')

const client = redis.createClient({
    url: 'redis://localhost:6379' // URL to your Redis instance
});

client.connect();

client.on('connect', function () {
    console.log('Connected to Redis');
});

client.on('error', function (err) {
    console.log('Redis error: ' + err);
});

const userRoomMap = new Map();

function registerSocketEvents(io, socket) {
    socket.on("join", (userName) => {
        const queueName = Math.random() < 0.5 ? 'waitingUsersA' : 'waitingUsersB';
        addUserToWaitingList(socket, queueName, userName);
        attemptToMatchUsers(io, queueName, userName);
    });

    socket.on("ready", (roomName) => {
        socket.to(roomName).emit("ready");
    });

    socket.on("ice-candidate", (candidate, roomName) => {
        socket.to(roomName).emit("ice-candidate", candidate);
    });

    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer, roomName);
    });

    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });

    socket.on("skip", async () => {
        const oldRoom = await client.get(`room:${socket.id}`);
        if (oldRoom) {
            socket.leave(oldRoom);
            io.to(oldRoom).emit("userSkipped", socket.id); // Notify the other user

            // Determine the other user in the room
            const otherSocketId = oldRoom.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '');
            const otherSocket = io.sockets.sockets.get(otherSocketId);

            // Remove users from their current queues and rooms
            await client.sRem('waitingUsersA', socket.id);
            await client.sRem('waitingUsersB', socket.id);
            await client.del(`room:${socket.id}`);

            if (otherSocket) {
                await client.del(`room:${otherSocketId}`);

                // Re-add users to the waiting lists for a new match
                await addUserToWaitingList(socket, 'waitingUsersA');
                await addUserToWaitingList(otherSocket, 'waitingUsersB');

                // Attempt to match both users in their respective new queues
                attemptToMatchUsers(io, 'waitingUsersB');
            }
            attemptToMatchUsers(io, 'waitingUsersA');
        }
    });

    socket.on("disconnect", async () => {
        console.log(`User disconnected: ${socket.id}`);

        // Remove the user from any waiting list they might be in and their room
        const wasInQueueA = await client.sRem('waitingUsersA', socket.id);
        const wasInQueueB = await client.sRem('waitingUsersB', socket.id);
        const oldRoom = await client.get(`room:${socket.id}`);

        if (oldRoom) {
            const otherSocketId = oldRoom.replace(`room-${socket.id}-`, '').replace(`-${socket.id}`, '');
            const otherSocket = io.sockets.sockets.get(otherSocketId);
            if (otherSocket) {
                otherSocket.leave(oldRoom);
                // Notify the other user in the room that their partner has disconnected
                io.to(otherSocket.id).emit("partnerDisconnected");
                // Optionally, move the remaining user to a waiting list for re-matching
                const newQueue = wasInQueueA ? 'waitingUsersB' : 'waitingUsersA'; // Switch queue if the user was in one
                await addUserToWaitingList(otherSocket, newQueue);
                attemptToMatchUsers(io, newQueue);
            }
            // Clean up room mappings
            await client.del(`room:${socket.id}`);
            if (otherSocketId) {
                await client.del(`room:${otherSocketId}`);
            }
        }

        // Attempt to match users in the remaining queue
        const queueToMatch = wasInQueueA > 0 ? 'waitingUsersA' : 'waitingUsersB';
        if (wasInQueueA > 0 || wasInQueueB > 0) {
            attemptToMatchUsers(io, queueToMatch);
        }
    });
}

async function addUserToWaitingList(socket, queueName, userName) {
    await client.sAdd(queueName, socket.id);
    const waitingUsers = await client.sCard(queueName);
    console.log(`User ${socket.id} added to waiting list ${queueName}. Waiting users: ${waitingUsers}`);
}

async function attemptToMatchUsers(io, queueName, userName) {
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
