const express = require('express');
const router = express.Router();
const Puzzle = require('../models/Puzzle');

// Get all puzzles
router.get('/', async (req, res) => {
  try {
    const puzzles = await Puzzle.find();
    res.json(puzzles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get daily puzzle
router.get('/daily', async (req, res) => {
  try {
    const puzzle = await Puzzle.findOne()
      .sort({ dateAdded: -1 }) // Get most recent
      .limit(1);
    res.json(puzzle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit puzzle solution
router.post('/:id/solve', async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) return res.status(404).json({ message: 'Puzzle not found' });

    // Validate solution (simplified example)
    const isCorrect = req.body.solution.join(',') === puzzle.solution.join(',');
    res.json({ correct: isCorrect });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;