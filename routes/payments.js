const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validatePayment } = require('../middleware/validation');
const { createPaymentIntent, constructWebhookEvent, handleWebhook } = require('../utils/stripe');

router.post('/create-payment-intent', authenticateToken, validatePayment, async (req, res) => {
  try {
    const { amount, currency, sellerId, customerInfo, metadata } = req.body;

    if (req.user.role !== 'owner' && req.user._id.toString() !== sellerId) {
      const User = require('../models/User');
      const seller = await User.findById(sellerId);
      if (!seller || !seller.sponsorId ||
          seller.sponsorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Je kunt alleen betalingen aanmaken voor jezelf of je teamleden'
        });
      }
    }

    const paymentIntent = await createPaymentIntent(
      amount,
      currency || 'eur',
      sellerId,
      customerInfo || {},
      metadata || {}
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (error) {
    console.error('Create payment intent fout:', error);
    res.status(500).json({ error: error.message || 'Server fout bij aanmaken betaling' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Webhook signature ontbreekt' });
    }

    const event = constructWebhookEvent(req.body, signature);

    console.log(`Stripe webhook ontvangen: ${event.type}`);

    await handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook verwerking fout:', error);
    res.status(400).json({ error: error.message || 'Webhook verwerking gefaald' });
  }
});

router.get('/status/:paymentIntentId', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const { stripe } = require('../utils/stripe');
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const Sale = require('../models/Sale');
    const sale = await Sale.findOne({ 'meta.stripePaymentIntentId': paymentIntentId })
      .populate('sellerId', 'name email role')
      .populate('computed.leaderId', 'name email role')
      .populate('computed.sponsorId', 'name email role');

    res.json({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created
      },
      sale: sale
    });
  } catch (error) {
    console.error('Get payment status fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen betalingsstatus' });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const Sale = require('../models/Sale');
    let query = { 'meta.source': 'stripe-payment' };

    if (req.user.role === 'agent') {
      query.sellerId = req.user._id;
    } else if (req.user.role === 'leader') {
      const User = require('../models/User');
      const teamMembers = await User.find({ sponsorId: req.user._id });
      const memberIds = teamMembers.map(member => member._id);
      memberIds.push(req.user._id);
      query.sellerId = { $in: memberIds };
    }

    const payments = await Sale.find(query)
      .populate('sellerId', 'name email role')
      .populate('computed.leaderId', 'name email role')
      .populate('computed.sponsorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalCount = await Sale.countDocuments(query);

    res.json({
      payments: payments,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: totalCount > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get payment history fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen betalingsgeschiedenis' });
  }
});

module.exports = router;