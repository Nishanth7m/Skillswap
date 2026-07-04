const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null, // Null for signup bonuses or manual adjustments
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Null for minting/signup bonus
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Null for reservation/escrow holding or burns
  },
  amount: {
    type: Number,
    required: true,
    min: [0.1, 'Transaction amount must be greater than 0'],
  },
  type: {
    type: String,
    enum: ['SIGNUP_BONUS', 'SESSION_RESERVATION', 'SESSION_PAYMENT', 'SESSION_REFUND', 'MANUAL_ADJUSTMENT'],
    required: true,
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'FAILED'],
    default: 'COMPLETED',
  },
}, {
  timestamps: true,
});

// Indexes for ledger balance audits and history queries
creditTransactionSchema.index({ fromUser: 1 });
creditTransactionSchema.index({ toUser: 1 });
creditTransactionSchema.index({ session: 1 });

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
