//user schema
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verified: {type: Boolean, required: true },
  token: {type: String, required: true },
}, { timestamps: true, collection: "Users" }); // Explicit collection name

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;