const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Login after register failed' });
      return res.json(user);
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json(req.user);
});

router.get('/logout', (req, res) => {
  req.logout();
  res.json({ message: 'Logged out' });
});

router.get('/user', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  res.json(req.user);
});

module.exports = router;