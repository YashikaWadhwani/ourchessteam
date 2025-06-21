const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String, // Hash with bcrypt later
  team: String,
  subscribed: Boolean,
});
module.exports = mongoose.model('User', userSchema);