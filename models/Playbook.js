const mongoose = require('mongoose');

// Playbook step keys (matching company phases)
const StepKey = ['leadlist', 'research', 'contact', 'present_finetune', 'deal'];

const playbookSchema = new mongoose.Schema({
  key: {
    type: String,
    enum: StepKey,
    required: true,
    unique: true
  },

  title: {
    type: String,
    required: true
  },

  // Plain text guide (markdown supported)
  plainTextGuide: {
    type: String,
    default: ''
  },

  // Psychologie tips (array van tips)
  psychologyTips: [{
    type: String
  }],

  // Checklist items (standaard items die agents kunnen gebruiken)
  checkItems: [{
    type: String
  }],

  // Voorbeeld zinnen/scripts
  examplePhrases: [{
    type: String
  }],

  // Last update timestamp
  lastUpdated: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

// Index voor snelle lookups
playbookSchema.index({ key: 1 });

// Helper method: get all playbook steps in order
playbookSchema.statics.getAllInOrder = async function() {
  const steps = await this.find({}).sort({ key: 1 }).lean();

  // Ensure correct order
  const stepOrder = ['leadlist', 'research', 'contact', 'present_finetune', 'deal'];
  return stepOrder.map(key => steps.find(s => s.key === key)).filter(Boolean);
};

module.exports = mongoose.model('Playbook', playbookSchema);
