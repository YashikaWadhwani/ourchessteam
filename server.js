require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing ${envVar} in .env`);
  }
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');

const app = express();
const httpServer = createServer(app);

// Middleware setup
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Database connection with improved configuration
mongoose.connect(process.env.MONGODB_URI, {
  //useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Socket.io setup with enhanced configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

// Game state management
const activeGames = new Map();

// Socket.io connection handlers
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinGame', (gameId, callback) => {
    try {
      if (!gameId) throw new Error('Game ID is required');
      
      if (!activeGames.has(gameId)) {
        activeGames.set(gameId, new Chess());
        console.log(`New game created: ${gameId}`);
      }
      
      const game = activeGames.get(gameId);
      socket.join(gameId);
      
      callback({
        status: 'success',
        gameState: {
          fen: game.fen(),
          pgn: game.pgn(),
          turn: game.turn(),
          isCheck: game.isCheck(),
          isCheckmate: game.isCheckmate()
        }
      });
      
    } catch (err) {
      callback({ status: 'error', message: err.message });
      console.error('Join game error:', err.message);
    }
  });

  socket.on('makeMove', ({ gameId, move }, callback) => {
    try {
      if (!gameId || !move) throw new Error('Game ID and move are required');
      
      const game = activeGames.get(gameId);
      if (!game) throw new Error('Game not found');
      
      const result = game.move(move);
      if (!result) throw new Error('Invalid move');
      
      io.to(gameId).emit('gameUpdate', {
        fen: game.fen(),
        pgn: game.pgn(),
        lastMove: move,
        turn: game.turn(),
        isCheck: game.isCheck(),
        isCheckmate: game.isCheckmate(),
        isDraw: game.isDraw()
      });
      
      callback({ status: 'success' });
      
    } catch (err) {
      callback({ status: 'error', message: err.message });
      console.error('Move error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});