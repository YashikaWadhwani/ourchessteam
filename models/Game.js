const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  whitePlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blackPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pgn: { type: String, required: true },
  result: { type: String, enum: ['1-0', '0-1', '1/2-1/2', '*'], default: '*' },
  timeControl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);