const mongoose = require('mongoose');

const voiceCallSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VoiceAgent',
    required: true
  },
  vapiCallId: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'ringing', 'in-progress', 'forwarding', 'ended'],
    default: 'queued'
  },
  endedReason: {
    type: String,
    enum: ['customer-ended-call', 'assistant-ended-call', 'customer-did-not-answer', 'customer-busy', 'call-transferred', 'exceeded-max-duration', 'voicemail', 'silence-timed-out', 'unknown'],
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  cost: {
    type: Number, // cost in credits (0.5 credits per minute = €0.50)
    default: 0
  },
  recording: {
    url: String,
    duration: Number,
    size: Number
  },
  transcript: {
    text: String,
    confidence: Number,
    language: String
  },
  analysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    summary: String,
    keywords: [String]
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

voiceCallSchema.index({ user: 1, createdAt: -1 });
voiceCallSchema.index({ agent: 1, createdAt: -1 });
voiceCallSchema.index({ vapiCallId: 1 });
voiceCallSchema.index({ status: 1 });

// Calculate cost based on duration (0.5 credits per minute = €0.50)
voiceCallSchema.pre('save', function(next) {
  if (this.duration && this.duration > 0) {
    const minutes = Math.ceil(this.duration / 60); // Round up to nearest minute
    this.cost = minutes * 0.5; // 0.5 credits per minute
  }
  next();
});

module.exports = mongoose.model('VoiceCall', voiceCallSchema);