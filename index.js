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

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Triggered when a peer hits the join room button.
  socket.on("join", () => {
    if (waitingUsers.size > 0) {
      const peerSocketId = waitingUsers.values().next().value; // Get the first waiting user
      waitingUsers.delete(peerSocketId); // Remove them from the waiting list

      const roomName = `room-${socket.id}-${peerSocketId}`; // Create a unique room name

      // Join the current socket to the room
      socket.join(roomName);

      // Join the peer socket to the room
      // You need to get the peer socket object from the connected sockets of your server
      const peerSocket = io.sockets.sockets.get(peerSocketId);
      if (peerSocket) {
        peerSocket.join(roomName);
      }

      // Inform both users
      io.to(roomName).emit("joined", roomName);

    } else {
      // No users waiting, add this user to the waiting list
      console.log(`adding user to waiting list`)
      waitingUsers.add(socket.id);
    }

    // Triggered when the person who joined the room is ready to communicate.
    socket.on("ready", (roomName) => {
      console.log(`ready event emitted for room ${roomName}`)
      socket.broadcast.to(roomName).emit("ready", roomName); // Informs the other peer in the room.
    });

    // Triggered when server gets an icecandidate from a peer in the room.
    socket.on("ice-candidate", (candidate, roomName) => {
      console.log(`ice-candidate event emitted for room ${roomName} with candidate ${candidate.candidate}`)
      socket.broadcast.to(roomName).emit("ice-candidate", candidate, roomName); // Sends Candidate to the other peer in the room.
    });

    // Triggered when server gets an offer from a peer in the room.
    socket.on("offer", (offer, roomName) => {
      console.log(`offer event emitted for room ${roomName} with offer ${offer}`)
      socket.broadcast.to(roomName).emit("offer", offer, roomName); // Sends Offer to the other peer in the room.
    });

    // Triggered when server gets an answer from a peer in the room.
    socket.on("answer", (answer, roomName) => {
      console.log(`answer event emitted for room ${roomName} with answer ${answer}`)
      socket.broadcast.to(roomName).emit("answer", answer); // Sends Answer to the other peer in the room.
    });

    // Triggered when a peer leaves the room.
    socket.on("leave", (roomName) => {
      socket.leave(roomName);
      socket.broadcast.to(roomName).emit("leave");
    });
    socket.on('disconnect', () => {
      // Handle disconnection
      // Remove user from waiting list if they are in it
      waitingUsers.delete(socket.id);
    });
  });
});

server.listen(port, () => {
  console.log(`Server ready on port ${port}`);
});