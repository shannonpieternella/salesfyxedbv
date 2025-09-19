const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    default: null
  },
  customer: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      zipCode: String,
      country: String
    },
    vatNumber: {
      type: String,
      trim: true
    }
  },
  items: [{
    description: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    vatRate: {
      type: Number,
      default: 21,
      min: 0,
      max: 100
    },
    vatAmount: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  dates: {
    invoiceDate: {
      type: Date,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    paidDate: {
      type: Date,
      default: null
    }
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'bank-transfer', 'cash', 'other'],
    default: 'stripe'
  },
  stripePaymentIntentId: {
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

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ sellerId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'dates.dueDate': 1 });
invoiceSchema.index({ stripePaymentIntentId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);