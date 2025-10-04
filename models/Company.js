const mongoose = require('mongoose');

// Enums
const ContactMethod = ['COLD_CALL', 'EMAIL', 'IN_PERSON'];
const StepStatus = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'SKIPPED'];
const DealResult = ['WON', 'LOST', 'PENDING'];
const Goal = ['LEADS', 'REVENUE', 'EFFICIENCY'];

// Contact attempt sub-schema
const contactAttemptSchema = new mongoose.Schema({
  method: { type: String, enum: ContactMethod, required: true },
  at: { type: Date, default: Date.now },
  outcome: { type: String, enum: ['CONNECTED', 'NO_ANSWER', 'REJECTED'], required: true },
  notes: { type: String, default: '' }
}, { _id: true });

// Checklist item sub-schema
const checklistItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  checked: { type: Boolean, default: false },
  // Optional link to a playbook step/phase this task belongs to
  stepKey: { type: String, enum: ['leadlist', 'research', 'contact', 'present_finetune', 'deal'], default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

// Phase history sub-schema (voor audit trail)
const phaseHistorySchema = new mongoose.Schema({
  phase: {
    type: String,
    enum: ['leadlist', 'research', 'contact', 'present_finetune', 'deal'],
    required: true
  },
  fromStatus: { type: String, enum: StepStatus },
  toStatus: { type: String, enum: StepStatus, required: true },
  at: { type: Date, default: Date.now },
  byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

// Main Company schema
const companySchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Basisgegevens
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  website: { type: String, trim: true },
  notes: { type: String, default: '' },
  tags: [{ type: String }],
  priority: { type: Number, min: 1, max: 5, default: 3 },

  // Doelen & missie (waarom dit bedrijf, wat is het doel)
  goals: {
    primary: { type: String, enum: Goal, default: 'LEADS' },
    description: { type: String, default: '' }
  },

  // Besparing hypothese (tijd/geld - centrale missie)
  savingsHypothesis: {
    timeHoursPerMonth: { type: Number, min: 0 },
    costPerMonth: { type: Number, min: 0 },
    notes: { type: String, default: '' }
  },

  // Checklist (to-do's per bedrijf)
  checklist: [checklistItemSchema],

  // 5-stappen stappenplan (embedded object)
  stepState: {
    // Stap 1: Leadlijst
    leadlist: {
      status: { type: String, enum: StepStatus, default: 'IN_PROGRESS' },
      startedAt: { type: Date, default: Date.now },
      completedAt: { type: Date },
      notes: { type: String, default: '' }
    },

    // Stap 2: Onderzoek
    research: {
      status: { type: String, enum: StepStatus, default: 'NOT_STARTED' },
      startedAt: { type: Date },
      completedAt: { type: Date },
      notes: { type: String, default: '' },
      findings: [{ type: String }],
      painPoints: [{ type: String }]
    },

    // Stap 3: Contact
    contact: {
      status: { type: String, enum: StepStatus, default: 'NOT_STARTED' },
      startedAt: { type: Date },
      completedAt: { type: Date },
      notes: { type: String, default: '' },
      method: { type: String, enum: ContactMethod, default: null },
      attempts: [contactAttemptSchema]
    },

    // Stap 4: Presentatie & Fine-tune
    present_finetune: {
      status: { type: String, enum: StepStatus, default: 'NOT_STARTED' },
      startedAt: { type: Date },
      completedAt: { type: Date },
      notes: { type: String, default: '' },
      adjustments: [{ type: String }],
      agreedSuccessCriteria: [{ type: String }]
    },

    // Stap 5: Deal
    deal: {
      status: { type: String, enum: StepStatus, default: 'NOT_STARTED' },
      startedAt: { type: Date },
      completedAt: { type: Date },
      notes: { type: String, default: '' },
      result: { type: String, enum: DealResult, default: null },
      valueEUR: { type: Number, min: 0 }
    }
  },

  // Huidige fase (voor snelle filtering)
  currentPhase: {
    type: String,
    enum: ['leadlist', 'research', 'contact', 'present_finetune', 'deal'],
    default: 'leadlist',
    index: true
  },

  // Fase geschiedenis (audit trail)
  phaseHistory: [phaseHistorySchema],

  // Soft delete
  deletedAt: { type: Date, default: null }

}, {
  timestamps: true
});

// Indexes voor performance & analytics
companySchema.index({ agentId: 1, currentPhase: 1 });
companySchema.index({ 'stepState.contact.method': 1 });
companySchema.index({ createdAt: -1 });
companySchema.index({ 'stepState.deal.result': 1 });
companySchema.index({ deletedAt: 1 });

// Helper method: volgende fase bepalen
companySchema.methods.getNextPhase = function() {
  const phaseOrder = ['leadlist', 'research', 'contact', 'present_finetune', 'deal'];
  const currentIndex = phaseOrder.indexOf(this.currentPhase);
  return currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : null;
};

// Helper method: update step en manage timestamps
companySchema.methods.updateStep = function(stepKey, updates, userId) {
  const step = this.stepState[stepKey];
  const oldStatus = step.status;

  // Update fields
  Object.assign(step, updates);

  // Manage timestamps
  if (updates.status === 'IN_PROGRESS' && !step.startedAt) {
    step.startedAt = new Date();
  }

  if ((updates.status === 'DONE' || updates.status === 'SKIPPED') && !step.completedAt) {
    step.completedAt = new Date();

    // Move to next phase if completed
    const nextPhase = this.getNextPhase();
    if (nextPhase) {
      this.currentPhase = nextPhase;
      this.stepState[nextPhase].status = 'IN_PROGRESS';
      if (!this.stepState[nextPhase].startedAt) {
        this.stepState[nextPhase].startedAt = new Date();
      }
    }
  }

  // Log in phase history
  this.phaseHistory.push({
    phase: stepKey,
    fromStatus: oldStatus,
    toStatus: updates.status || oldStatus,
    at: new Date(),
    byUserId: userId
  });
};

// Exclude deleted by default
companySchema.pre(/^find/, function() {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
});

module.exports = mongoose.model('Company', companySchema);
