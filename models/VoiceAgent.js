const mongoose = require('mongoose');

const voiceAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  systemPrompt: {
    type: String,
    required: true,
    maxlength: 5000
  },
  voice: {
    provider: {
      type: String,
      enum: ['11labs', 'openai', 'azure'],
      default: '11labs'
    },
    voiceId: {
      type: String,
      required: true
    },
    stability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    similarityBoost: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  model: {
    provider: {
      type: String,
      enum: ['openai', 'anthropic'],
      default: 'openai'
    },
    model: {
      type: String,
      default: 'gpt-3.5-turbo'
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    }
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  vapiAssistantId: {
    type: String,
    sparse: true
  },
  lastSyncAt: {
    type: Date
  },
  callSettings: {
    maxDuration: {
      type: Number,
      default: 300, // 5 minutes in seconds
      min: 30,
      max: 3600
    },
    recordCalls: {
      type: Boolean,
      default: true
    },
    transcribeCalls: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

voiceAgentSchema.index({ owner: 1 });
voiceAgentSchema.index({ owner: 1, isActive: 1 });

module.exports = mongoose.model('VoiceAgent', voiceAgentSchema);