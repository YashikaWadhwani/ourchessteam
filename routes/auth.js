const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // ONLY ONE TIME
const User = require('../models/User');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    // ... registration logic
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // ... login logic
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;