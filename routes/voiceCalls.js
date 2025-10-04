const express = require('express');
const router = express.Router();
const VoiceCall = require('../models/VoiceCall');
const VoiceAgent = require('../models/VoiceAgent');
const User = require('../models/User');
const { CreditTransaction } = require('../models/Credit');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const VapiClient = require('../utils/vapi');

// Get call history for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const calls = await VoiceCall.find({ user: req.user.id })
      .populate('agent', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await VoiceCall.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      data: {
        calls,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Fout bij ophalen gesprekken:', error);
    res.status(500).json({
      success: false,
      error: 'Kon gesprekken niet ophalen'
    });
  }
});

// Get single call details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const call = await VoiceCall.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('agent', 'name description');

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Gesprek niet gevonden'
      });
    }

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    console.error('Fout bij ophalen gesprek:', error);
    res.status(500).json({
      success: false,
      error: 'Kon gesprek niet ophalen'
    });
  }
});

// Initiate a new call
router.post('/initiate', authenticateToken, [
  body('agentId').isMongoId().withMessage('Geldige agent ID is verplicht'),
  body('phoneNumber').trim().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Geldig telefoonnummer is verplicht')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validatiefout',
        details: errors.array()
      });
    }

    const { agentId, phoneNumber } = req.body;

    // Check if agent exists and is global
    const agent = await VoiceAgent.findOne({
      _id: agentId,
      isGlobal: true,
      isActive: true
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent niet gevonden'
      });
    }

    // Check user credit balance
    const user = await User.findById(req.user.id);
    if (!user || !user.credits || user.credits.balance < 0.5) {
      return res.status(402).json({
        success: false,
        error: 'Onvoldoende credits. Laad eerst je account op.'
      });
    }

    let call;
    try {
      // Initialize Vapi client
      const vapi = new VapiClient();

      // Create call record first
      call = new VoiceCall({
        user: req.user.id,
        agent: agentId,
        vapiCallId: `temp_${Date.now()}`, // Will be updated with actual Vapi call ID
        phoneNumber,
        status: 'queued'
      });

      await call.save();

      // Create call with Vapi using assistant ID
      const callConfig = {
        assistantId: agent.vapiAssistantId,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: phoneNumber
        }
      };
      const vapiCall = await vapi.createCall(callConfig);

      // Update call record with actual Vapi call ID
      call.vapiCallId = vapiCall.id;
      call.status = vapiCall.status;
      await call.save();

      res.status(201).json({
        success: true,
        data: {
          callId: call._id,
          vapiCallId: vapiCall.id,
          status: vapiCall.status,
          message: 'Gesprek wordt gestart...'
        }
      });

    } catch (vapiError) {
      console.error('Vapi API error:', vapiError);

      // If we have a call record, update it as failed
      if (call) {
        call.status = 'failed';
        call.endedReason = 'system-error';
        await call.save();
      }

      return res.status(500).json({
        success: false,
        error: 'Kon gesprek niet starten via Vapi: ' + vapiError.message
      });
    }

  } catch (error) {
    console.error('Fout bij starten gesprek:', error);
    res.status(500).json({
      success: false,
      error: 'Kon gesprek niet starten'
    });
  }
});

// Webhook endpoint for Vapi call status updates
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    switch (event.message?.type) {
      case 'status-update':
        await handleStatusUpdate(event);
        break;
      case 'end-of-call-report':
        await handleEndOfCall(event);
        break;
      case 'transcript':
        await handleTranscript(event);
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook fout:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Handle call status updates
async function handleStatusUpdate(event) {
  const { call } = event.message;

  await VoiceCall.findOneAndUpdate(
    { vapiCallId: call.id },
    {
      status: call.status,
      startedAt: call.startedAt ? new Date(call.startedAt) : undefined,
      endedAt: call.endedAt ? new Date(call.endedAt) : undefined
    }
  );
}

// Handle end of call report
async function handleEndOfCall(event) {
  const { call, transcript, recording } = event.message;

  const callRecord = await VoiceCall.findOne({ vapiCallId: call.id }).populate('user');
  if (!callRecord) return;

  // Calculate duration and cost
  const duration = call.endedAt && call.startedAt
    ? Math.floor((new Date(call.endedAt) - new Date(call.startedAt)) / 1000)
    : 0;

  const minutes = Math.ceil(duration / 60);
  const cost = minutes * 0.5;

  // Update call record
  await VoiceCall.findOneAndUpdate(
    { vapiCallId: call.id },
    {
      status: 'ended',
      endedReason: call.endedReason,
      duration,
      cost,
      endedAt: new Date(call.endedAt),
      recording: recording ? {
        url: recording.recordingUrl,
        duration: recording.durationSeconds
      } : undefined,
      transcript: transcript ? {
        text: transcript.text,
        confidence: transcript.confidence
      } : undefined
    }
  );

  // Deduct credits from user balance
  if (cost > 0) {
    const user = await User.findById(callRecord.user._id);
    if (user && user.credits) {
      user.credits.balance = Math.max(0, user.credits.balance - cost);
      user.credits.totalUsed += cost;
      await user.save();

      // Create transaction record
      await new CreditTransaction({
        user: callRecord.user._id,
        type: 'usage',
        amount: -cost,
        description: `Gesprek van ${minutes} ${minutes === 1 ? 'minuut' : 'minuten'}`,
        relatedCall: callRecord._id,
        balanceAfter: user.credits.balance
      }).save();
    }
  }
}

// Handle transcript updates
async function handleTranscript(event) {
  const { call, transcript } = event.message;

  await VoiceCall.findOneAndUpdate(
    { vapiCallId: call.id },
    {
      $set: {
        'transcript.text': transcript.text,
        'transcript.confidence': transcript.confidence
      }
    }
  );
}

module.exports = router;
