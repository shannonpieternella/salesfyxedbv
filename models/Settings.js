const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  plan: {
    type: String,
    default: 'default'
  },
  shares: {
    seller: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1
    },
    leader: {
      type: Number,
      default: 0.10,
      min: 0,
      max: 1
    },
    sponsor: {
      type: Number,
      default: 0.10,
      min: 0,
      max: 1
    },
    fyxedMin: {
      type: Number,
      default: 0.30,
      min: 0,
      max: 1
    }
  },
  pricing: {
    leadActivationPerLead: {
      type: Number,
      default: 50,
      min: 0
    },
    baseRetainerMin: {
      type: Number,
      default: 1000,
      min: 0
    },
    customizationMultiplierCap: {
      type: Number,
      default: 20000,
      min: 0
    }
  },
  invoice: {
    defaultVatRate: {
      type: Number,
      default: 21,
      min: 0,
      max: 100
    },
    paymentTermsDays: {
      type: Number,
      default: 30,
      min: 1
    },
    company: {
      name: {
        type: String,
        default: 'Fyxed BV'
      },
      address: {
        street: String,
        city: String,
        zipCode: String,
        country: String
      },
      kvk: String,
      vatNumber: String,
      bankAccount: String
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);