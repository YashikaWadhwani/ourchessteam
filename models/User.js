const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rating: { type: Number, default: 800 },
  role: { type: String, enum: ['player', 'coach', 'admin'], default: 'player' },
  joinedDate: { type: Date, default: Date.now },
  trainingPackages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TrainingPackage' }],
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('User', UserSchema);