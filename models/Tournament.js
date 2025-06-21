const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  timeControl: { type: String, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  rounds: { type: Number, required: true },
  currentRound: { type: Number, default: 1 },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' }
});

module.exports = mongoose.model('Tournament', tournamentSchema);