const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  comment: {
    type: String,
    default: '',
    trim: true,
  },
  role: {
    type: String,
    enum: ['TEACHER', 'LEARNER'], // Represents the role of the recipient being reviewed
    required: true,
  },
}, {
  timestamps: true,
});

// Enforce unique review per session per author
reviewSchema.index({ session: 1, author: 1 }, { unique: true });
reviewSchema.index({ recipient: 1 });

module.exports = mongoose.model('Review', reviewSchema);
