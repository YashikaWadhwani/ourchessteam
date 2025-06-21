const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// Save game
router.post('/', async (req, res) => {
  try {
    const game = new Game(req.body);
    await game.save();
    res.status(201).json(game);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user's games
router.get('/user/:userId', async (req, res) => {
  try {
    const games = await Game.find({
      $or: [{ whitePlayer: req.params.userId }, { blackPlayer: req.params.userId }]
    }).sort({ date: -1 });
    res.json(games);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;