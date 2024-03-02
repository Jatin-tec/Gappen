const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
var logger = require('morgan');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(logger('dev'));
app.set('view engine', 'ejs'); 
app.set('views', __dirname + '/templates'); 
app.use('/static', express.static(join(__dirname, 'public')))

var homeRouter = require('./routes/home')
app.use('/', homeRouter);

var callRouter = require('./routes/call')
app.use('/room', callRouter);


io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Triggered when a peer hits the join room button.
  socket.on("join", (roomName) => {

    const { rooms } = io.sockets.adapter;
    const room = rooms.get(roomName);

    console.log(`joining room ${room}`)

    if (room === undefined) {
      // room == undefined when no such room exists.
      console.log(`creating room ${roomName}`)
      socket.join(roomName);
      socket.emit("created", roomName);
    } else if (room.size === 1) {
      // room.size == 1 when one person is inside the room.
      console.log(`joining room ${roomName}`)
      socket.join(roomName);
      socket.emit("joined", roomName);
    } else {
      // when there are already two people inside the room.
      socket.emit("full");
    }
    // Triggered when the person who joined the room is ready to communicate.
    socket.on("ready", (roomName) => {
      console.log(`ready event emitted for room ${roomName}`)
      socket.broadcast.to(roomName).emit("ready"); // Informs the other peer in the room.
    });

    // Triggered when server gets an icecandidate from a peer in the room.
    socket.on("ice-candidate", (candidate, roomName) => {
      console.log(candidate);
      socket.broadcast.to(roomName).emit("ice-candidate", candidate); // Sends Candidate to the other peer in the room.
    });

    // Triggered when server gets an offer from a peer in the room.
    socket.on("offer", (offer, roomName) => {
      socket.broadcast.to(roomName).emit("offer", offer); // Sends Offer to the other peer in the room.
    });

    // Triggered when server gets an answer from a peer in the room.
    socket.on("answer", (answer, roomName) => {
      socket.broadcast.to(roomName).emit("answer", answer); // Sends Answer to the other peer in the room.
    });

    socket.on("leave", (roomName) => {
      socket.leave(roomName);
      socket.broadcast.to(roomName).emit("leave");
    });
  });
});

server.listen(3000, () => {
  console.log('Server ready on port 3000.');
});