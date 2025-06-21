const mongoose = require('mongoose');

const puzzleSchema = new mongoose.Schema({
  fen: { type: String, required: true },
  solution: { type: [String], required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  theme: { type: String, required: true },
  rating: { type: Number, default: 1500 },
  dateAdded: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Puzzle', puzzleSchema);