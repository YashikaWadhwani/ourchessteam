const mongoose = require('mongoose');
const { Chess } = require('chess.js');

const GameSchema = new mongoose.Schema({
  whitePlayer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  blackPlayer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  fen: { 
    type: String, 
    default: new Chess().fen() 
  },
  pgn: { type: String },
  timeControl: { 
    type: String,
    enum: ['bullet', 'blitz', 'rapid', 'classical'],
    default: 'rapid'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished', 'aborted'],
    default: 'waiting'
  },
  result: {
    white: { type: Number, default: 0 },
    black: { type: Number, default: 0 }
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  finishedAt: {
    type: Date
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

GameSchema.virtual('moves').get(function() {
  const chess = new Chess(this.fen);
  return chess.history();
});

GameSchema.pre('save', function(next) {
  if (this.isModified('fen') {
    const chess = new Chess(this.fen);
    this.pgn = chess.pgn();
  }
  next();
});

module.exports = mongoose.model('Game', GameSchema);