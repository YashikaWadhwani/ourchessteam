// sockets/socketManager.js
const { Server } = require('socket.io');
const Chess = require('chess.js');
const Game = require('../models/Game');
const User = require('../models/User');
const Tournament = require('../models/Tournament');

class SocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URLS.split(',') || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true
      }
    });

    this.activeGames = new Map(); // gameId -> { chess, players, spectators }
    this.userSockets = new Map(); // userId -> socketId[]

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.use(this.authenticate.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  async authenticate(socket, next) {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    try {
      const user = await User.verifyToken(token);
      socket.user = user;
      this.trackUserSocket(user._id, socket.id);
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  }

  trackUserSocket(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId).push(socketId);
  }

  async handleConnection(socket) {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    socket.on('joinGame', this.handleJoinGame.bind(this, socket));
    socket.on('makeMove', this.handleMakeMove.bind(this, socket));
    socket.on('offerDraw', this.handleOfferDraw.bind(this, socket));
    socket.on('resign', this.handleResign.bind(this, socket));
    socket.on('disconnect', this.handleDisconnect.bind(this, socket));
  }

  async handleJoinGame(socket, gameId) {
    try {
      const game = await Game.findById(gameId)
        .populate('whitePlayer blackPlayer tournament');

      if (!game) throw new Error('Game not found');

      // Initialize game state if not already active
      if (!this.activeGames.has(gameId)) {
        this.activeGames.set(gameId, {
          chess: new Chess(game.fen),
          players: new Set(),
          spectators: new Set(),
          gameData: game
        });
      }

      const activeGame = this.activeGames.get(gameId);

      // Verify player authorization
      if (![game.whitePlayer._id, game.blackPlayer._id].some(id => id.equals(socket.user._id))) {
        if (!socket.user.isAdmin) {
          activeGame.spectators.add(socket.id);
        }
      } else {
        activeGame.players.add(socket.id);
      }

      socket.join(gameId);

      // Send full game state
      socket.emit('gameState', {
        fen: activeGame.chess.fen(),
        pgn: activeGame.chess.pgn(),
        turn: activeGame.chess.turn(),
        players: {
          white: game.whitePlayer,
          black: game.blackPlayer
        },
        timeControl: game.timeControl,
        status: game.status
      });

      // Notify others
      socket.to(gameId).emit('playerJoined', {
        userId: socket.user._id,
        name: socket.user.name
      });

    } catch (err) {
      socket.emit('error', err.message);
      console.error('Join game error:', err);
    }
  }

  async handleMakeMove(socket, { gameId, move }) {
    try {
      const activeGame = this.activeGames.get(gameId);
      if (!activeGame) throw new Error('Game not active');

      // Validate player turn
      const chess = activeGame.chess;
      if ((chess.turn() === 'w' && !activeGame.gameData.whitePlayer._id.equals(socket.user._id)) ||
          (chess.turn() === 'b' && !activeGame.gameData.blackPlayer._id.equals(socket.user._id))) {
        throw new Error('Not your turn');
      }

      // Make the move
      const result = chess.move(move);
      if (!result) throw new Error('Invalid move');

      // Broadcast new state
      this.io.to(gameId).emit('gameState', {
        fen: chess.fen(),
        pgn: chess.pgn(),
        turn: chess.turn()
      });

      // Check for game end
      if (chess.isGameOver()) {
        await this.handleGameEnd(gameId, chess);
      }

      // Auto-save every 5 moves
      if (chess.history().length % 5 === 0) {
        await Game.findByIdAndUpdate(gameId, {
          fen: chess.fen(),
          pgn: chess.pgn()
        });
      }

    } catch (err) {
      socket.emit('moveError', err.message);
      console.error('Move error:', err);
    }
  }

  async handleGameEnd(gameId, chess) {
    const activeGame = this.activeGames.get(gameId);
    const result = {
      status: 'finished',
      fen: chess.fen(),
      pgn: chess.pgn()
    };

    if (chess.isCheckmate()) {
      result.winner = chess.turn() === 'w' ? 'black' : 'white';
    } else if (chess.isDraw()) {
      result.result = 'draw';
    }

    // Update database
    await Game.findByIdAndUpdate(gameId, result);

    // Notify players
    this.io.to(gameId).emit('gameEnded', result);

    // Cleanup
    this.activeGames.delete(gameId);
  }

  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.user.name} (${socket.id})`);

    // Remove from user tracking
    const userSockets = this.userSockets.get(socket.user._id);
    if (userSockets) {
      const index = userSockets.indexOf(socket.id);
      if (index !== -1) userSockets.splice(index, 1);
      if (userSockets.length === 0) {
        this.userSockets.delete(socket.user._id);
      }
    }

    // Remove from active games
    this.activeGames.forEach((game, gameId) => {
      if (game.players.has(socket.id)) {
        game.players.delete(socket.id);
        this.io.to(gameId).emit('playerDisconnected', {
          userId: socket.user._id,
          name: socket.user.name
        });

        if (game.players.size === 0) {
          this.activeGames.delete(gameId);
        }
      }
    });
  }
}

module.exports = SocketManager;