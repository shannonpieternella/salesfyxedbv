const express = require('express');
const router = express.Router();
const VoiceAgent = require('../models/VoiceAgent');
const { authenticateToken, requireRole } = require('../middleware/auth');
const VapiClient = require('../utils/vapi');

// Sync assistants from Vapi account (admin only)
router.post('/sync-vapi-assistants', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const vapi = new VapiClient();

    // Get all assistants from Vapi
    const vapiAssistants = await vapi.getAssistants();

    if (!vapiAssistants || !Array.isArray(vapiAssistants)) {
      return res.status(500).json({
        success: false,
        error: 'Kon geen assistants ophalen van Vapi'
      });
    }

    const syncedAgents = [];

    for (const assistant of vapiAssistants) {
      // Check if agent already exists
      let existingAgent = await VoiceAgent.findOne({ vapiAssistantId: assistant.id });

      if (existingAgent) {
        // Update existing agent
        existingAgent.name = assistant.name || existingAgent.name;
        existingAgent.isActive = true;
        existingAgent.lastSyncAt = new Date();
        await existingAgent.save();
        syncedAgents.push(existingAgent);
      } else {
        // Create new agent from Vapi assistant
        const newAgent = new VoiceAgent({
          name: assistant.name || `Assistant ${assistant.id.substring(0, 8)}`,
          description: `Vapi Assistant - ${assistant.model?.model || 'AI Agent'}`,
          owner: req.user.id, // Admin is owner
          systemPrompt: assistant.model?.messages?.[0]?.content || 'Je bent een behulpzame AI assistent.',
          voice: {
            provider: assistant.voice?.provider || '11labs',
            voiceId: assistant.voice?.voiceId || 'rachel',
            stability: assistant.voice?.stability || 0.5,
            similarityBoost: assistant.voice?.similarityBoost || 0.5
          },
          model: {
            provider: assistant.model?.provider || 'openai',
            model: assistant.model?.model || 'gpt-3.5-turbo',
            temperature: assistant.model?.temperature || 0.7
          },
          callSettings: {
            maxDuration: assistant.maxDurationSeconds || 300,
            recordCalls: assistant.recordingEnabled !== false,
            transcribeCalls: true
          },
          vapiAssistantId: assistant.id,
          isGlobal: true, // Available to all users
          lastSyncAt: new Date()
        });

        await newAgent.save();
        syncedAgents.push(newAgent);
      }
    }

    res.json({
      success: true,
      data: {
        synced: syncedAgents.length,
        agents: syncedAgents
      },
      message: `${syncedAgents.length} assistants gesynchroniseerd van Vapi`
    });

  } catch (error) {
    console.error('Fout bij synchroniseren Vapi assistants:', error);
    res.status(500).json({
      success: false,
      error: 'Kon Vapi assistants niet synchroniseren: ' + error.message
    });
  }
});

// Get all global agents (admin view)
router.get('/global-agents', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const agents = await VoiceAgent.find({
      isGlobal: true,
      isActive: true
    }).sort({ lastSyncAt: -1, createdAt: -1 });

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Fout bij ophalen global agents:', error);
    res.status(500).json({
      success: false,
      error: 'Kon global agents niet ophalen'
    });
  }
});

// Toggle agent availability
router.patch('/global-agents/:id/toggle', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const agent = await VoiceAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent niet gevonden'
      });
    }

    agent.isActive = !agent.isActive;
    await agent.save();

    res.json({
      success: true,
      data: agent,
      message: `Agent ${agent.isActive ? 'geactiveerd' : 'gedeactiveerd'}`
    });
  } catch (error) {
    console.error('Fout bij toggle agent:', error);
    res.status(500).json({
      success: false,
      error: 'Kon agent status niet wijzigen'
    });
  }
});

module.exports = router;