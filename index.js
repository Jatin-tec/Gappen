const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
var logger = require('morgan');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3001;

app.use(logger('dev'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/templates');
app.use('/static', express.static(join(__dirname, 'public')))

var homeRouter = require('./routes/home')
app.use('/', homeRouter);

var callRouter = require('./routes/call')
app.use('/room', callRouter);

const waitingUsers = new Set();
const userRoomMap = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  registerSocketEvents(socket);
});

function registerSocketEvents(socket) {
  socket.on("join", () => {
    addUserToWaitingList(socket);
    attemptToMatchUsers();
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

  socket.on("skip", () => {
    const oldRoom = userRoomMap.get(socket.id);
    if (oldRoom) {
      socket.leave(oldRoom);
      io.to(oldRoom).emit("userSkipped", socket.id); // Notify the other user
      addUserToWaitingList(socket);
      attemptToMatchUsers();
    }
  })

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    waitingUsers.delete(socket);
    // Optionally, handle disconnection while in a call
  });
}

function addUserToWaitingList(socket) {
  waitingUsers.add(socket.id);
  console.log(`User ${socket.id} added to waiting list. Waiting users: ${waitingUsers.size}`);
}

function attemptToMatchUsers() {
  while (waitingUsers.size >= 2) {
    const iterator = waitingUsers.values();
    const user1Id = iterator.next().value;
    const user2Id = iterator.next().value;

    const user1Socket = io.sockets.sockets.get(user1Id);
    const user2Socket = io.sockets.sockets.get(user2Id);

    if (user1Socket && user2Socket) {
      waitingUsers.delete(user1Id);
      waitingUsers.delete(user2Id);

      const roomName = `room-${user1Id}-${user2Id}`;
      user1Socket.join(roomName);
      user2Socket.join(roomName);

      userRoomMap.set(user1Id, roomName);
      userRoomMap.set(user2Id, roomName);

      io.to(roomName).emit("roomJoined", roomName);
      console.log(`Users ${user1Id} and ${user2Id} joined room ${roomName}`);
    }
  }
}

server.listen(port, () => {
  console.log(`Server ready on port ${port}`);
});