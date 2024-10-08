const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attempts: {
    type: Number,
    default: 0, // O número de tentativas começa em 0
  },
  completed: {
    type: Boolean,
    default: false, // O exercício começa como não completado
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Exercise', ExerciseSchema);
