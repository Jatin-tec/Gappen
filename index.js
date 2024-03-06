require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const logger = require('morgan');
const socketIO = require('socket.io');
const app = express();

const server = http.createServer(app);
const redis = require('redis')
const io = socketIO(server);

// Import routes
const homeRouter = require('./routes/home')
const callRouter = require('./routes/call')

// Import socket event handlers
const { registerSocketEvents } = require('./socketHandlers/handlers');

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const client = redis.createClient({
  url: REDIS_URL // URL to your Redis instance
});

client.connect();

client.on('connect', function () {
  console.log('Connected to Redis');
});

client.on('error', function (err) {
  console.log('Redis error: ' + err);
});

app.use(logger('dev'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname + '/templates'));
app.use('/static', express.static(path.join(__dirname, 'public')))


app.use('/', homeRouter);
app.use('/room', callRouter);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  registerSocketEvents(io, socket, client);
});

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});