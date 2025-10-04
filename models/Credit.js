const mongoose = require('mongoose');

const creditSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPurchased: {
    type: Number,
    default: 0,
    min: 0
  },
  totalUsed: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

const creditTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['purchase', 'usage', 'refund', 'admin_adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  relatedCall: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VoiceCall'
  },
  stripePaymentIntent: {
    type: String
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

creditSchema.index({ user: 1 });
creditTransactionSchema.index({ user: 1, createdAt: -1 });
creditTransactionSchema.index({ type: 1, createdAt: -1 });

const Credit = mongoose.model('Credit', creditSchema);
const CreditTransaction = mongoose.model('CreditTransaction', creditTransactionSchema);

module.exports = { Credit, CreditTransaction };