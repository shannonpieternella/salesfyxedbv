const express = require('express');
const router = express.Router();
const VoiceAgent = require('../models/VoiceAgent');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all global agents available to users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const agents = await VoiceAgent.find({
      isGlobal: true,
      isActive: true
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Fout bij ophalen agents:', error);
    res.status(500).json({
      success: false,
      error: 'Kon agents niet ophalen'
    });
  }
});

// Get single agent
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({
      _id: req.params.id,
      isGlobal: true,
      isActive: true
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent niet gevonden'
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Fout bij ophalen agent:', error);
    res.status(500).json({
      success: false,
      error: 'Kon agent niet ophalen'
    });
  }
});

// Note: Users can no longer create/edit/delete agents
// All agent management is done by admins via Vapi sync

module.exports = router;