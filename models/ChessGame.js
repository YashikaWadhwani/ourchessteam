const mongoose = require('mongoose');

const ChessGameSchema = new mongoose.Schema({
  whitePlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blackPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pgn: { type: String, required: true },
  result: { type: String, enum: ['1-0', '0-1', '1/2-1/2', '*'] },
  timeControl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }
});

module.exports = mongoose.model('ChessGame', ChessGameSchema);