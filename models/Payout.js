const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2020
    }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  breakdown: {
    ownSales: {
      type: Number,
      default: 0,
      min: 0
    },
    overrides: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending'
  },
  paymentReference: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

payoutSchema.index({ userId: 1, 'period.year': 1, 'period.month': 1 }, { unique: true });
payoutSchema.index({ status: 1 });
payoutSchema.index({ 'period.year': 1, 'period.month': 1 });

module.exports = mongoose.model('Payout', payoutSchema);