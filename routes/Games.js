const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// Save completed game
router.post('/', async (req, res) => {
  try {
    const game = new Game(req.body);
    await game.save();
    
    // Update player ratings (simplified)
    if (game.result === '1-0') {
      await User.findByIdAndUpdate(game.whitePlayer, { $inc: { rating: 10 } });
      await User.findByIdAndUpdate(game.blackPlayer, { $inc: { rating: -10 } });
    } else if (game.result === '0-1') {
      await User.findByIdAndUpdate(game.whitePlayer, { $inc: { rating: -10 } });
      await User.findByIdAndUpdate(game.blackPlayer, { $inc: { rating: 10 } });
    }
    
    res.status(201).json(game);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get user's game history
router.get('/user/:userId', async (req, res) => {
  try {
    const games = await Game