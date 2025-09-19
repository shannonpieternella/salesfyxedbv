const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR',
    enum: ['EUR', 'USD', 'GBP']
  },
  customer: {
    name: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    contact: {
      type: String,
      trim: true
    }
  },
  meta: {
    source: {
      type: String,
      enum: ['lead-activation', 'retainer', 'custom', 'stripe-payment', 'manual-invoice'],
      default: 'custom'
    },
    notes: {
      type: String,
      trim: true
    },
    invoiceNumber: {
      type: String,
      trim: true
    },
    stripePaymentIntentId: {
      type: String,
      trim: true
    },
    stripeChargeId: {
      type: String,
      trim: true
    }
  },
  computed: {
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    sellerShare: {
      type: Number,
      required: true,
      min: 0
    },
    leaderShare: {
      type: Number,
      default: 0,
      min: 0
    },
    sponsorShare: {
      type: Number,
      default: 0,
      min: 0
    },
    fyxedShare: {
      type: Number,
      required: true,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['open', 'approved', 'paid'],
    default: 'open'
  }
}, {
  timestamps: true
});

saleSchema.index({ sellerId: 1, createdAt: -1 });
saleSchema.index({ 'computed.leaderId': 1, createdAt: -1 });
saleSchema.index({ 'computed.sponsorId': 1, createdAt: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ 'meta.stripePaymentIntentId': 1 });
saleSchema.index({ 'meta.invoiceNumber': 1 });

module.exports = mongoose.model('Sale', saleSchema);