const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
    default: 'PENDING',
  },
  score: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Ensure a user cannot send multiple match requests to the same user
matchSchema.index({ requester: 1, recipient: 1 }, { unique: true });
matchSchema.index({ status: 1 });

module.exports = mongoose.model('Match', matchSchema);
