const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  points: {
    type: Number,
    default: 0, // Inicialmente o usuário começa com 0 pontos
  },
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
