const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  whitePlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  blackPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pgn: String,
  result: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);