const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Activity = require('../models/Activity');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware: alle routes require auth
router.use(authenticateToken);

// Helper: check if user can access company
const canAccessCompany = async (userId, userRole, companyId) => {
  // Admins and Owners can access all companies
  if (userRole === 'admin' || userRole === 'owner') return true;

  const company = await Company.findById(companyId);
  return company && company.agentId.toString() === userId.toString();
};

// POST /companies - Create new company
router.post('/', requireRole(['agent', 'admin', 'owner', 'leader']), async (req, res) => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      website,
      notes,
      tags,
      priority,
      goals,
      savingsHypothesis,
      checklist
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const company = new Company({
      agentId: req.user._id,
      name,
      contactPerson,
      phone,
      email,
      website,
      notes,
      tags,
      priority,
      goals,
      savingsHypothesis,
      checklist: checklist || [],
      currentPhase: 'leadlist',
      stepState: {
        leadlist: { status: 'IN_PROGRESS', startedAt: new Date() },
        research: { status: 'NOT_STARTED' },
        contact: { status: 'NOT_STARTED' },
        present_finetune: { status: 'NOT_STARTED' },
        deal: { status: 'NOT_STARTED' }
      }
    });

    await company.save();

    // Log activity
    await Activity.log(company._id, req.user._id, 'CREATE', {
      companyName: name
    });

    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Error creating company', details: error.message });
  }
});

// GET /companies - Get all companies (with filtering)
router.get('/', async (req, res) => {
  try {
    const {
      phase,
      status,
      method,
      q,
      from,
      to,
      page = 1,
      limit = 20,
      sort = '-createdAt',
      agentId
    } = req.query;

    const query = {};

    // Admin can filter by agentId, agent sees only their own
    if (req.user.role === 'admin' && agentId) {
      query.agentId = agentId;
    } else if (req.user.role === 'agent') {
      query.agentId = req.user._id;
    }

    // Filters
    if (phase) query.currentPhase = phase;
    if (method) query['stepState.contact.method'] = method;

    // Date range
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Search by name
    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }

    // Status filter (tricky - search in stepState)
    if (status && phase) {
      query[`stepState.${phase}.status`] = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('agentId', 'name email')
        .lean(),
      Company.countDocuments(query)
    ]);

    res.json({
      companies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Error fetching companies', details: error.message });
  }
});

// GET /companies/:id - Get single company
router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('agentId', 'name email');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Access check
    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Error fetching company', details: error.message });
  }
});

// PUT /companies/:id - Update company basic info
router.put('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'contactPerson', 'phone', 'email', 'website',
      'notes', 'tags', 'priority', 'goals', 'savingsHypothesis'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    await company.save();

    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Error updating company', details: error.message });
  }
});

// DELETE /companies/:id - Soft delete company
router.delete('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    company.deletedAt = new Date();
    await company.save();

    res.json({ message: 'Company deleted', company });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Fout bij verwijderen bedrijf', details: error.message });
  }
});

// PUT /companies/:id/steps/:stepKey - Update specific step
router.put('/:id/steps/:stepKey', async (req, res) => {
  try {
    const { id, stepKey } = req.params;
    const validSteps = ['leadlist', 'research', 'contact', 'present_finetune', 'deal'];

    if (!validSteps.includes(stepKey)) {
      return res.status(400).json({ error: 'Invalid step' });
    }

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    // Use helper method to update step
    company.updateStep(stepKey, req.body, req.user._id);
    await company.save();

    // Log activity
    await Activity.log(company._id, req.user._id, 'UPDATE_STEP', {
      stepKey,
      updates: req.body
    });

    res.json(company);
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'Error updating step', details: error.message });
  }
});

// POST /companies/:id/contact/attempts - Add contact attempt
router.post('/:id/contact/attempts', async (req, res) => {
  try {
    const { method, outcome, notes } = req.body;

    if (!method || !outcome) {
      return res.status(400).json({ error: 'Method and outcome are required' });
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    // Add attempt
    company.stepState.contact.attempts.push({
      method,
      outcome,
      notes: notes || '',
      at: new Date()
    });

    // Update method if not set
    if (!company.stepState.contact.method) {
      company.stepState.contact.method = method;
    }

    // If connected, maybe update status
    if (outcome === 'CONNECTED' && company.stepState.contact.status === 'NOT_STARTED') {
      company.stepState.contact.status = 'IN_PROGRESS';
      if (!company.stepState.contact.startedAt) {
        company.stepState.contact.startedAt = new Date();
      }
    }

    await company.save();

    // Log activity
    await Activity.log(company._id, req.user._id, 'CONTACT_ATTEMPT', {
      method,
      outcome,
      notes
    });

    res.json(company);
  } catch (error) {
    console.error('Error adding contact attempt:', error);
    res.status(500).json({ error: 'Error adding contact attempt', details: error.message });
  }
});

// PUT /companies/:id/deal - Update deal result
router.put('/:id/deal', async (req, res) => {
  try {
    const { result, valueEUR, notes } = req.body;

    if (!result) {
      return res.status(400).json({ error: 'Deal result is required' });
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    // Update deal
    company.stepState.deal.result = result;
    company.stepState.deal.status = 'DONE';

    if (valueEUR !== undefined) {
      company.stepState.deal.valueEUR = valueEUR;
    }

    if (notes !== undefined) {
      company.stepState.deal.notes = notes;
    }

    if (!company.stepState.deal.startedAt) {
      company.stepState.deal.startedAt = new Date();
    }

    company.stepState.deal.completedAt = new Date();
    company.currentPhase = 'deal';

    await company.save();

    // Log activity
    await Activity.log(company._id, req.user._id, 'DEAL_RESULT', {
      result,
      valueEUR,
      notes
    });

    res.json(company);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Error updating deal', details: error.message });
  }
});

// POST /companies/:id/checklist - Add checklist item
router.post('/:id/checklist', async (req, res) => {
  try {
    const { label, stepKey } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    company.checklist.push({
      label,
      checked: false,
      stepKey: stepKey || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await company.save();

    res.json(company);
  } catch (error) {
    console.error('Error adding checklist item:', error);
    res.status(500).json({ error: 'Error adding checklist item', details: error.message });
  }
});

// PATCH /companies/:id/checklist/:itemId/toggle - Toggle checklist item
router.patch('/:id/checklist/:itemId/toggle', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    const item = company.checklist.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    item.checked = !item.checked;
    item.updatedAt = new Date();

    await company.save();

    // Log activity
    await Activity.log(company._id, req.user._id, 'CHECKLIST_TOGGLE', {
      itemLabel: item.label,
      checked: item.checked
    });

    res.json(company);
  } catch (error) {
    console.error('Error toggling checklist item:', error);
    res.status(500).json({ error: 'Error toggling checklist item', details: error.message });
  }
});

// DELETE /companies/:id/checklist/:itemId - Delete checklist item
router.delete('/:id/checklist/:itemId', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    company.checklist.pull(req.params.itemId);
    await company.save();

    res.json(company);
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ error: 'Error deleting checklist item', details: error.message });
  }
});

// GET /companies/:id/activity - Get activity log
router.get('/:id/activity', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const hasAccess = await canAccessCompany(req.user._id, req.user.role, company._id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find({ companyId: req.params.id })
        .sort({ at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('agentId', 'name email')
        .lean(),
      Activity.countDocuments({ companyId: req.params.id })
    ]);

    res.json({
      activities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Error fetching activity log', details: error.message });
  }
});

module.exports = router;
