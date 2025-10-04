const express = require('express');
const router = express.Router();
const Playbook = require('../models/Playbook');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware: alle routes require auth
router.use(authenticateToken);

// GET /playbook - Get all playbook steps (agents can read)
router.get('/', async (req, res) => {
  try {
    const steps = await Playbook.getAllInOrder();
    res.json(steps);
  } catch (error) {
    console.error('Error fetching playbook:', error);
    res.status(500).json({ error: 'Error fetching playbook', details: error.message });
  }
});

// GET /playbook/:key - Get single playbook step
router.get('/:key', async (req, res) => {
  try {
    const step = await Playbook.findOne({ key: req.params.key });

    if (!step) {
      return res.status(404).json({ error: 'Playbook step not found' });
    }

    res.json(step);
  } catch (error) {
    console.error('Error fetching playbook step:', error);
    res.status(500).json({ error: 'Error fetching playbook step', details: error.message });
  }
});

// PUT /playbook/:key - Update playbook step (admin only)
router.put('/:key', requireRole('admin'), async (req, res) => {
  try {
    const {
      title,
      plainTextGuide,
      psychologyTips,
      checkItems,
      examplePhrases
    } = req.body;

    const step = await Playbook.findOne({ key: req.params.key });

    if (!step) {
      return res.status(404).json({ error: 'Playbook step not found' });
    }

    // Update fields
    if (title !== undefined) step.title = title;
    if (plainTextGuide !== undefined) step.plainTextGuide = plainTextGuide;
    if (psychologyTips !== undefined) step.psychologyTips = psychologyTips;
    if (checkItems !== undefined) step.checkItems = checkItems;
    if (examplePhrases !== undefined) step.examplePhrases = examplePhrases;

    step.lastUpdated = new Date();
    await step.save();

    res.json(step);
  } catch (error) {
    console.error('Error updating playbook step:', error);
    res.status(500).json({ error: 'Error updating playbook step', details: error.message });
  }
});

module.exports = router;
