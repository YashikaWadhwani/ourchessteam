require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const User = require('./models/User');
const Puzzle = require('./models/Puzzle');
const Tournament = require('./models/Tournament');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.io for real-time chess
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinGame', (gameId) => {
    socket.join(gameId);
    console.log(`Player joined game: ${gameId}`);
  });

  socket.on('makeMove', ({ gameId, move }) => {
    io.to(gameId).emit('moveMade', move);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/games', require('./routes/games'));
app.use('/api/puzzles', require('./routes/puzzles'));
app.use('/api/tournaments', require('./routes/tournaments'));

// All other routes go to React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});