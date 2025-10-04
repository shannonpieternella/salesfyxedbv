const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { CreditTransaction } = require('../models/Credit');
const { authenticateToken } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');

// Get user credit balance and transaction history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Gebruiker niet gevonden'
      });
    }

    // Initialize credits if not exists
    if (!user.credits) {
      user.credits = {
        balance: 5.0,
        totalUsed: 0,
        totalPurchased: 0
      };
      await user.save();

      // Create transaction record for demo credits
      await new CreditTransaction({
        user: req.user.id,
        type: 'admin_adjustment',
        amount: 5,
        description: 'Welkomst demo budget - €5 gratis om het systeem te testen',
        balanceAfter: 5
      }).save();

      console.log(`🎁 Demo budget toegevoegd voor nieuwe gebruiker: ${req.user.email}`);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const transactions = await CreditTransaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedCall', 'phoneNumber duration');

    const totalTransactions = await CreditTransaction.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      data: {
        balance: user.credits.balance,
        totalPurchased: user.credits.totalPurchased,
        totalUsed: user.credits.totalUsed,
        transactions,
        pagination: {
          page,
          limit,
          total: totalTransactions,
          pages: Math.ceil(totalTransactions / limit)
        }
      }
    });
  } catch (error) {
    console.error('Fout bij ophalen budget:', error);
    res.status(500).json({
      success: false,
      error: 'Kon budget informatie niet ophalen'
    });
  }
});

// Create Stripe Checkout session for purchasing credits
router.post('/purchase', authenticateToken, [
  body('credits').isInt({ min: 10, max: 2000 }).withMessage('Budget moet tussen €10 en €2000 zijn')
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

    const { credits } = req.body;
    const amount = credits * 1.0; // €1.00 per credit

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `€${credits} Voice Call Budget`,
              description: 'Budget voor AI voice calls (€0.50 per minuut bellen)',
              images: ['https://via.placeholder.com/300x200/4BACFE/FFFFFF?text=Voice+Credits']
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/voice-agents?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/voice-agents?payment=cancelled`,
      metadata: {
        userId: req.user.id,
        credits: credits.toString(),
        type: 'credit_purchase'
      },
      customer_email: req.user.email,
      billing_address_collection: 'required'
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        amount,
        credits
      }
    });

  } catch (error) {
    console.error('Fout bij aanmaken Stripe Checkout:', error);
    res.status(500).json({
      success: false,
      error: 'Kon betaling niet initialiseren: ' + error.message
    });
  }
});

// Webhook for successful credit purchases
router.post('/webhook', async (req, res) => {
  let event;

  try {
    event = req.body;
  } catch (err) {
    console.error('Webhook body parsing failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSuccessfulCheckout(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful checkout session
async function handleSuccessfulCheckout(session) {
  const { userId, credits } = session.metadata;
  const creditsAmount = parseFloat(credits);

  if (!userId || !creditsAmount) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Find user and update credits
  const user = await User.findById(userId);
  if (!user) {
    console.error('User not found for budget purchase:', userId);
    return;
  }

  // Initialize credits if not exists
  if (!user.credits) {
    user.credits = { balance: 0, totalUsed: 0, totalPurchased: 0 };
  }

  // Add credits to balance
  user.credits.balance += creditsAmount;
  user.credits.totalPurchased += creditsAmount;
  await user.save();

  // Create transaction record
  await new CreditTransaction({
    user: userId,
    type: 'purchase',
    amount: creditsAmount,
    description: `Budget opwaardering van €${creditsAmount.toFixed(2)} via Stripe Checkout`,
    stripePaymentIntent: session.payment_intent,
    balanceAfter: user.credits.balance,
    metadata: {
      sessionId: session.id,
      amountPaid: session.amount_total / 100 // Convert from cents
    }
  }).save();

  console.log(`✅ Budget toegevoegd via Checkout: €${creditsAmount.toFixed(2)} voor gebruiker ${userId}`);
}

// Handle successful credit purchase
async function handleSuccessfulPayment(paymentIntent) {
  const { userId, credits } = paymentIntent.metadata;
  const creditsAmount = parseFloat(credits);

  if (!userId || !creditsAmount) {
    console.error('Missing metadata in payment intent');
    return;
  }

  // Find user and update credits
  const user = await User.findById(userId);
  if (!user) {
    console.error('User not found for budget purchase:', userId);
    return;
  }

  // Initialize credits if not exists
  if (!user.credits) {
    user.credits = { balance: 0, totalUsed: 0, totalPurchased: 0 };
  }

  // Add credits to balance
  user.credits.balance += creditsAmount;
  user.credits.totalPurchased += creditsAmount;
  await user.save();

  // Create transaction record
  await new CreditTransaction({
    user: userId,
    type: 'purchase',
    amount: creditsAmount,
    description: `Budget opwaardering van €${creditsAmount.toFixed(2)}`,
    stripePaymentIntent: paymentIntent.id,
    balanceAfter: user.credits.balance
  }).save();

  console.log(`✅ Budget toegevoegd: €${creditsAmount.toFixed(2)} voor gebruiker ${userId}`);
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
  console.log(`❌ Betaling gefaald voor payment intent: ${paymentIntent.id}`);
}

// Admin endpoint to adjust credits
router.post('/admin/adjust', authenticateToken, [
  body('userId').isMongoId().withMessage('Geldige gebruiker ID is verplicht'),
  body('amount').isFloat().withMessage('Geldig bedrag is verplicht'),
  body('reason').trim().isLength({ min: 1 }).withMessage('Reden is verplicht')
], async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Alleen owners kunnen budget aanpassen'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validatiefout',
        details: errors.array()
      });
    }

    const { userId, amount, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Gebruiker niet gevonden'
      });
    }

    // Initialize credits if not exists
    if (!user.credits) {
      user.credits = { balance: 0, totalUsed: 0, totalPurchased: 0 };
    }

    user.credits.balance = user.credits.balance + amount; // Allow negative balance
    await user.save();

    // Create transaction record
    await new CreditTransaction({
      user: userId,
      type: 'admin_adjustment',
      amount,
      description: `Admin aanpassing: ${reason}`,
      balanceAfter: user.credits.balance
    }).save();

    res.json({
      success: true,
      data: {
        newBalance: user.credits.balance,
        adjustment: amount
      },
      message: 'Budget succesvol aangepast'
    });

  } catch (error) {
    console.error('Fout bij budget aanpassing:', error);
    res.status(500).json({
      success: false,
      error: 'Kon budget niet aanpassen'
    });
  }
});

module.exports = router;