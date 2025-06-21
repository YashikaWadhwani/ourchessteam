require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { Server } = require('socket.io');
const http = require('http');
const Chess = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ourchessteam')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Socket.io for real-time chess
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinGame', (gameId) => {
    socket.join(gameId);
    if (!activeGames.has(gameId)) {
      activeGames.set(gameId, new Chess());
    }
    socket.emit('gameState', activeGames.get(gameId).fen());
  });

  socket.on('makeMove', ({ gameId, move }) => {
    const game = activeGames.get(gameId);
    try {
      game.move(move);
      io.to(gameId).emit('gameState', game.fen());
    } catch (err) {
      socket.emit('moveError', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/puzzles', require('./routes/puzzles'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/training', require('./routes/training'));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});