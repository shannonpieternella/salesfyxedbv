const Invoice = require('../models/Invoice');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { computeShares } = require('./calculations');
const moment = require('moment');

async function generateInvoiceNumber() {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `FY${currentYear}`;

    const lastInvoice = await Invoice.findOne({
      invoiceNumber: new RegExp(`^${prefix}`)
    }).sort({ invoiceNumber: -1 });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    throw new Error(`Fout bij genereren factuurnummer: ${error.message}`);
  }
}

async function createOfflineInvoice(invoiceData, sellerId) {
  try {
    const seller = await User.findById(sellerId);
    if (!seller) {
      throw new Error('Verkoper niet gevonden');
    }

    const settings = await Settings.findOne().sort({ createdAt: -1 });
    const vatRate = settings ? settings.invoice.defaultVatRate : 21;
    const paymentTerms = settings ? settings.invoice.paymentTermsDays : 30;

    const invoiceNumber = invoiceData.invoiceNumber || await generateInvoiceNumber();

    const items = invoiceData.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    const invoice = new Invoice({
      invoiceNumber: invoiceNumber,
      sellerId: sellerId,
      customer: {
        name: invoiceData.customer.name,
        company: invoiceData.customer.company || '',
        email: invoiceData.customer.email || '',
        address: invoiceData.customer.address || {},
        vatNumber: invoiceData.customer.vatNumber || ''
      },
      items: items,
      totals: {
        subtotal: Math.round(subtotal * 100) / 100,
        vatRate: vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        total: Math.round(total * 100) / 100
      },
      dates: {
        invoiceDate: invoiceData.invoiceDate || new Date(),
        dueDate: invoiceData.dueDate || moment().add(paymentTerms, 'days').toDate()
      },
      status: invoiceData.status || 'sent',
      paymentMethod: invoiceData.paymentMethod || 'bank-transfer',
      notes: invoiceData.notes || ''
    });

    await invoice.save();

    if (invoiceData.createSale !== false) {
      const saleAmount = invoice.totals.total;
      const calculation = await computeShares(saleAmount, sellerId);

      const sale = new Sale({
        sellerId: sellerId,
        amount: saleAmount,
        currency: 'EUR',
        customer: {
          name: invoice.customer.name,
          company: invoice.customer.company,
          contact: invoice.customer.email
        },
        meta: {
          source: 'manual-invoice',
          invoiceNumber: invoice.invoiceNumber,
          notes: `Gekoppeld aan factuur ${invoice.invoiceNumber}`
        },
        computed: {
          leaderId: calculation.leaderId,
          sponsorId: calculation.sponsorId,
          sellerShare: calculation.sellerShare,
          leaderShare: calculation.leaderShare,
          sponsorShare: calculation.sponsorShare,
          fyxedShare: calculation.fyxedShare
        },
        status: invoice.status === 'paid' ? 'paid' : 'open'
      });

      await sale.save();

      invoice.saleId = sale._id;
      await invoice.save();

      return {
        invoice: invoice,
        sale: sale,
        calculation: calculation
      };
    }

    return {
      invoice: invoice
    };
  } catch (error) {
    throw new Error(`Fout bij aanmaken offline factuur: ${error.message}`);
  }
}

async function markInvoiceAsPaid(invoiceId, paymentDate = null, paymentReference = '') {
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Factuur niet gevonden');
    }

    invoice.status = 'paid';
    invoice.dates.paidDate = paymentDate || new Date();

    if (paymentReference) {
      invoice.notes = invoice.notes ?
        `${invoice.notes}\nBetaalreferentie: ${paymentReference}` :
        `Betaalreferentie: ${paymentReference}`;
    }

    await invoice.save();

    if (invoice.saleId) {
      const sale = await Sale.findById(invoice.saleId);
      if (sale) {
        sale.status = 'paid';
        await sale.save();
      }
    }

    return invoice;
  } catch (error) {
    throw new Error(`Fout bij markeren factuur als betaald: ${error.message}`);
  }
}

async function getInvoicesForSeller(sellerId, filters = {}) {
  try {
    const query = { sellerId: sellerId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      query['dates.invoiceDate'] = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const invoices = await Invoice.find(query)
      .populate('sellerId', 'name email')
      .populate('saleId')
      .sort({ 'dates.invoiceDate': -1 });

    return invoices;
  } catch (error) {
    throw new Error(`Fout bij ophalen facturen: ${error.message}`);
  }
}

async function getOverdueInvoices() {
  try {
    const today = new Date();
    const overdueInvoices = await Invoice.find({
      status: { $in: ['sent'] },
      'dates.dueDate': { $lt: today }
    })
    .populate('sellerId', 'name email')
    .sort({ 'dates.dueDate': 1 });

    return overdueInvoices;
  } catch (error) {
    throw new Error(`Fout bij ophalen achterstallige facturen: ${error.message}`);
  }
}

async function updateInvoiceStatus(invoiceId, newStatus) {
  try {
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Ongeldige factuurstatus');
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Factuur niet gevonden');
    }

    invoice.status = newStatus;

    if (newStatus === 'paid' && !invoice.dates.paidDate) {
      invoice.dates.paidDate = new Date();
    }

    await invoice.save();

    if (invoice.saleId) {
      const sale = await Sale.findById(invoice.saleId);
      if (sale) {
        if (newStatus === 'paid') {
          sale.status = 'paid';
        } else if (newStatus === 'cancelled') {
          sale.status = 'open';
        }
        await sale.save();
      }
    }

    return invoice;
  } catch (error) {
    throw new Error(`Fout bij updaten factuurstatus: ${error.message}`);
  }
}

module.exports = {
  generateInvoiceNumber,
  createOfflineInvoice,
  markInvoiceAsPaid,
  getInvoicesForSeller,
  getOverdueInvoices,
  updateInvoiceStatus
};