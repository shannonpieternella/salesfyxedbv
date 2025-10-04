const mongoose = require('mongoose');

// Activity types
const ActivityType = [
  'CREATE',
  'UPDATE_STEP',
  'ADD_NOTE',
  'CONTACT_ATTEMPT',
  'CHECKLIST_TOGGLE',
  'STATUS_CHANGE',
  'DEAL_RESULT'
];

const activitySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ActivityType,
    required: true
  },

  // Flexible payload voor verschillende activity types
  // bijv: { stepKey: 'contact', oldStatus: 'NOT_STARTED', newStatus: 'IN_PROGRESS' }
  // of:   { noteText: 'Gebeld maar geen gehoor' }
  // of:   { checklistItem: 'Offerte versturen', checked: true }
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  at: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  timestamps: false // We gebruiken 'at' field
});

// Compound indexes voor analytics & filtering
activitySchema.index({ companyId: 1, at: -1 });
activitySchema.index({ agentId: 1, at: -1 });
activitySchema.index({ type: 1, at: -1 });

// Helper method: create activity log
activitySchema.statics.log = async function(companyId, agentId, type, payload = {}) {
  return this.create({
    companyId,
    agentId,
    type,
    payload,
    at: new Date()
  });
};

module.exports = mongoose.model('Activity', activitySchema);
