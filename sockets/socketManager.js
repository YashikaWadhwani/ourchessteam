const { Server } = require('socket.io');
const Chess = require('chess.js');
const jwt = require('jsonwebtoken');
const Game = require('../models/Game');
const User = require('../models/User');

class SocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 120000,
        skipMiddlewares: false
      }
    });

    this.activeGames = new Map();
    this.userConnections = new Map();

    this.initializeSocketEvents();
  }

  async authenticate(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error('Authentication token missing');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) throw new Error('User not found');
      
      socket.user = user;
      this.trackUserConnection(user._id.toString(), socket.id);
      next();
    } catch (err) {
      next(new Error(`Authentication failed: ${err.message}`));
    }
  }

  trackUserConnection(userId, socketId) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(socketId);
  }

  initializeSocketEvents() {
    this.io.use((socket, next) => this.authenticate(socket, next));

    this.io.on('connection', (socket) => {
      console.log(`⚡ New connection: ${socket.user.username} (${socket.id})`);

      socket.on('joinGame', (gameId) => this.handleJoinGame(socket, gameId));
      socket.on('makeMove', (data) => this.handleMakeMove(socket, data));
      socket.on('offerDraw', (gameId) => this.handleDrawOffer(socket, gameId));
      socket.on('resign', (gameId) => this.handleResignation(socket, gameId));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  async handleJoinGame(socket, gameId) {
    try {
      const game = await Game.findById(gameId)
        .populate('whitePlayer blackPlayer', 'username rating avatar');

      if (!game) throw new Error('Game not found');

      // Initialize game state if not active
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
      const isPlayer = [game.whitePlayer._id, game.blackPlayer._id]
        .some(id => id.equals(socket.user._id));

      if (isPlayer) {
        activeGame.players.add(socket.id);
      } else {
        activeGame.spectators.add(socket.id);
      }

      socket.join(gameId);

      // Send game state
      socket.emit('gameState', this.getGameState(activeGame));

      // Notify others
      if (isPlayer) {
        socket.to(gameId).emit('playerActivity', {
          type: 'join',
          userId: socket.user._id,
          username: socket.user.username
        });
      }

    } catch (err) {
      socket.emit('error', err.message);
      console.error('Join game error:', err);
    }
  }

  getGameState(game) {
    return {
      fen: game.chess.fen(),
      pgn: game.chess.pgn(),
      turn: game.chess.turn(),
      players: {
        white: game.gameData.whitePlayer,
        black: game.gameData.blackPlayer
      },
      status: game.gameData.status,
      lastMove: game.chess.history({ verbose: true }).slice(-1)[0]
    };
  }

  async handleMakeMove(socket, { gameId, move }) {
    try {
      const activeGame = this.activeGames.get(gameId);
      if (!activeGame) throw new Error('Game not active');

      const chess = activeGame.chess;
      const gameData = activeGame.gameData;

      // Validate player turn
      const isWhite = gameData.whitePlayer._id.equals(socket.user._id);
      const isBlack = gameData.blackPlayer._id.equals(socket.user._id);
      
      if ((chess.turn() === 'w' && !isWhite) || (chess.turn() === 'b' && !isBlack)) {
        throw new Error('Not your turn');
      }

      // Make the move
      const moveResult = chess.move(move);
      if (!moveResult) throw new Error('Invalid move');

      // Update game data
      gameData.fen = chess.fen();
      gameData.pgn = chess.pgn();

      // Broadcast new state
      this.io.to(gameId).emit('gameState', this.getGameState(activeGame));

      // Check for game end
      if (chess.isGameOver()) {
        await this.handleGameEnd(activeGame);
      }

      // Save game progress
      await gameData.save();

    } catch (err) {
      socket.emit('moveError', err.message);
      console.error('Move error:', err);
    }
  }

  async handleGameEnd(game) {
    const chess = game.chess;
    const gameData = game.gameData;

    if (chess.isCheckmate()) {
      gameData.winner = chess.turn() === 'w' ? gameData.blackPlayer : gameData.whitePlayer;
      gameData.result = chess.turn() === 'w' ? '0-1' : '1-0';
    } else if (chess.isDraw()) {
      gameData.result = '½-½';
    }

    gameData.status = 'finished';
    gameData.endedAt = new Date();

    // Save final game state
    await gameData.save();

    // Broadcast game end
    this.io.to(gameData._id.toString()).emit('gameEnded', {
      result: gameData.result,
      winner: gameData.winner,
      pgn: gameData.pgn
    });

    // Cleanup
    this.activeGames.delete(gameData._id.toString());
  }

  handleDisconnect(socket) {
    console.log(`💤 Disconnected: ${socket.user.username} (${socket.id})`);

    // Remove from user tracking
    const userSockets = this.userConnections.get(socket.user._id.toString());
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userConnections.delete(socket.user._id.toString());
      }
    }

    // Remove from active games
    this.activeGames.forEach((game, gameId) => {
      if (game.players.has(socket.id)) {
        game.players.delete(socket.id);
        this.io.to(gameId).emit('playerActivity', {
          type: 'disconnect',
          userId: socket.user._id,
          username: socket.user.username
        });
      }
    });
  }
}

module.exports = SocketManager;