const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Sale = require('../models/Sale');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { computeShares } = require('./calculations');

async function createPaymentIntent(amount, currency, sellerId, customerInfo, metadata = {}) {
  try {
    const seller = await User.findById(sellerId);
    if (!seller) {
      throw new Error('Verkoper niet gevonden');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        sellerId: sellerId.toString(),
        sellerName: seller.name,
        customerName: customerInfo.name || 'Onbekend',
        ...metadata
      }
    });

    return paymentIntent;
  } catch (error) {
    throw new Error(`Fout bij aanmaken Stripe payment intent: ${error.message}`);
  }
}

async function handleSuccessfulPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Betaling niet succesvol afgerond');
    }

    const amount = paymentIntent.amount / 100;
    const sellerId = paymentIntent.metadata.sellerId;

    if (!sellerId) {
      throw new Error('Verkoper ID niet gevonden in payment metadata');
    }

    const calculation = await computeShares(amount, sellerId);

    const sale = new Sale({
      sellerId: sellerId,
      amount: amount,
      currency: paymentIntent.currency.toUpperCase(),
      customer: {
        name: paymentIntent.metadata.customerName || 'Stripe klant',
        contact: paymentIntent.receipt_email || ''
      },
      meta: {
        source: 'stripe-payment',
        stripePaymentIntentId: paymentIntentId,
        notes: `Automatisch aangemaakt via Stripe betaling`
      },
      computed: {
        leaderId: calculation.leaderId,
        sponsorId: calculation.sponsorId,
        sellerShare: calculation.sellerShare,
        leaderShare: calculation.leaderShare,
        sponsorShare: calculation.sponsorShare,
        fyxedShare: calculation.fyxedShare
      },
      status: 'approved'
    });

    await sale.save();

    return {
      sale: sale,
      calculation: calculation
    };
  } catch (error) {
    throw new Error(`Fout bij verwerken succesvolle betaling: ${error.message}`);
  }
}

async function createCustomerInvoice(invoiceData, sellerId) {
  try {
    const seller = await User.findById(sellerId);
    if (!seller) {
      throw new Error('Verkoper niet gevonden');
    }

    if (!seller.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: invoiceData.customer.email,
        name: invoiceData.customer.name,
        metadata: {
          sellerId: sellerId.toString(),
          sellerName: seller.name
        }
      });

      seller.stripeCustomerId = customer.id;
      await seller.save();
    }

    const invoiceItems = invoiceData.items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.description,
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }));

    const invoice = await stripe.invoices.create({
      customer: seller.stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: {
        sellerId: sellerId.toString(),
        sellerName: seller.name,
        invoiceNumber: invoiceData.invoiceNumber
      }
    });

    for (const item of invoiceItems) {
      await stripe.invoiceItems.create({
        customer: seller.stripeCustomerId,
        invoice: invoice.id,
        price_data: item.price_data,
        quantity: item.quantity,
      });
    }

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    return finalizedInvoice;
  } catch (error) {
    throw new Error(`Fout bij aanmaken Stripe factuur: ${error.message}`);
  }
}

async function handleWebhook(event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const result = await handleSuccessfulPayment(paymentIntent.id);
        console.log(`Payment succesvol verwerkt: Sale ${result.sale._id}`);
        return result;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleInvoicePayment(invoice);
        console.log(`Factuur betaling succesvol verwerkt: ${invoice.id}`);
        break;

      case 'customer.created':
        console.log(`Nieuwe klant aangemaakt: ${event.data.object.id}`);
        break;

      default:
        console.log(`Onbekend webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Webhook verwerking gefaald: ${error.message}`);
    throw error;
  }
}

async function handleInvoicePayment(stripeInvoice) {
  try {
    const invoice = await Invoice.findOne({
      stripePaymentIntentId: stripeInvoice.payment_intent
    });

    if (invoice) {
      invoice.status = 'paid';
      invoice.dates.paidDate = new Date();
      await invoice.save();

      if (invoice.saleId) {
        const sale = await Sale.findById(invoice.saleId);
        if (sale) {
          sale.status = 'paid';
          await sale.save();
        }
      }
    }
  } catch (error) {
    console.error(`Fout bij verwerken factuur betaling: ${error.message}`);
    throw error;
  }
}

function constructWebhookEvent(body, signature) {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    throw new Error(`Webhook signature verificatie gefaald: ${error.message}`);
  }
}

module.exports = {
  createPaymentIntent,
  handleSuccessfulPayment,
  createCustomerInvoice,
  handleWebhook,
  handleInvoicePayment,
  constructWebhookEvent,
  stripe
};