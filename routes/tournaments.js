const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const User = require('../models/User');

// Create new tournament
router.post('/', async (req, res) => {
  try {
    const tournament = new Tournament(req.body);
    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('participants', 'username rating')
      .sort({ startDate: 1 });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register for tournament
router.post('/:id/register', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (tournament.participants.includes(req.body.userId)) {
      return res.status(400).json({ message: 'Already registered' });
    }

    tournament.participants.push(req.body.userId);
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;