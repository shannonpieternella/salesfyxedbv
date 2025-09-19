const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateInvoice, validateObjectId, validateDateRange } = require('../middleware/validation');
const { createOfflineInvoice, markInvoiceAsPaid, getInvoicesForSeller, updateInvoiceStatus } = require('../utils/invoices');

router.post('/', authenticateToken, validateInvoice, async (req, res) => {
  try {
    const invoiceData = req.body;

    if (req.user.role !== 'owner' && req.user._id.toString() !== invoiceData.sellerId) {
      const seller = await User.findById(invoiceData.sellerId);
      if (!seller || !seller.sponsorId ||
          seller.sponsorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Je kunt alleen facturen aanmaken voor jezelf of je teamleden'
        });
      }
    }

    const result = await createOfflineInvoice(invoiceData, invoiceData.sellerId);

    res.status(201).json({
      message: 'Factuur succesvol aangemaakt',
      invoice: result.invoice,
      sale: result.sale || null,
      calculation: result.calculation || null
    });
  } catch (error) {
    console.error('Create invoice fout:', error);
    res.status(500).json({ error: error.message || 'Server fout bij aanmaken factuur' });
  }
});

router.get('/', authenticateToken, validateDateRange, async (req, res) => {
  try {
    const { sellerId, status, startDate, endDate } = req.query;

    let targetSellerId = sellerId;

    if (req.user.role === 'agent') {
      targetSellerId = req.user._id;
    } else if (req.user.role === 'leader' && !sellerId) {
      const teamMembers = await User.find({ sponsorId: req.user._id });
      const memberIds = teamMembers.map(member => member._id);
      memberIds.push(req.user._id);

      const query = { sellerId: { $in: memberIds } };

      if (status) query.status = status;
      if (startDate && endDate) {
        query['dates.invoiceDate'] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const invoices = await Invoice.find(query)
        .populate('sellerId', 'name email')
        .populate('saleId')
        .sort({ 'dates.invoiceDate': -1 });

      return res.json({ invoices: invoices });
    }

    if (targetSellerId) {
      const filters = { status };
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      const invoices = await getInvoicesForSeller(targetSellerId, filters);
      res.json({ invoices: invoices });
    } else if (req.user.role === 'owner') {
      const query = {};
      if (status) query.status = status;
      if (startDate && endDate) {
        query['dates.invoiceDate'] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const invoices = await Invoice.find(query)
        .populate('sellerId', 'name email')
        .populate('saleId')
        .sort({ 'dates.invoiceDate': -1 });

      res.json({ invoices: invoices });
    } else {
      res.status(403).json({ error: 'Toegang geweigerd' });
    }
  } catch (error) {
    console.error('Get invoices fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen facturen' });
  }
});

router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('sellerId', 'name email role')
      .populate('saleId');

    if (!invoice) {
      return res.status(404).json({ error: 'Factuur niet gevonden' });
    }

    if (req.user.role === 'agent' && invoice.sellerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Toegang geweigerd' });
    }

    if (req.user.role === 'leader') {
      const seller = await User.findById(invoice.sellerId._id);
      const hasAccess = invoice.sellerId._id.toString() === req.user._id.toString() ||
                       (seller.sponsorId && seller.sponsorId.toString() === req.user._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: 'Toegang geweigerd' });
      }
    }

    res.json({ invoice: invoice });
  } catch (error) {
    console.error('Get invoice fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen factuur' });
  }
});

router.patch('/:id/status', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Ongeldige factuurstatus' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Factuur niet gevonden' });
    }

    if (req.user.role === 'agent') {
      return res.status(403).json({ error: 'Agents kunnen factuurstatus niet wijzigen' });
    }

    if (req.user.role === 'leader') {
      const seller = await User.findById(invoice.sellerId);
      const hasAccess = invoice.sellerId.toString() === req.user._id.toString() ||
                       (seller.sponsorId && seller.sponsorId.toString() === req.user._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: 'Toegang geweigerd' });
      }
    }

    const updatedInvoice = await updateInvoiceStatus(req.params.id, status);

    res.json({
      message: 'Factuurstatus succesvol bijgewerkt',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Update invoice status fout:', error);
    res.status(500).json({ error: error.message || 'Server fout bij bijwerken factuurstatus' });
  }
});

router.patch('/:id/mark-paid', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { paymentDate, paymentReference } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Factuur niet gevonden' });
    }

    if (req.user.role === 'agent') {
      return res.status(403).json({ error: 'Agents kunnen facturen niet als betaald markeren' });
    }

    if (req.user.role === 'leader') {
      const seller = await User.findById(invoice.sellerId);
      const hasAccess = invoice.sellerId.toString() === req.user._id.toString() ||
                       (seller.sponsorId && seller.sponsorId.toString() === req.user._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: 'Toegang geweigerd' });
      }
    }

    const updatedInvoice = await markInvoiceAsPaid(
      req.params.id,
      paymentDate ? new Date(paymentDate) : null,
      paymentReference || ''
    );

    res.json({
      message: 'Factuur succesvol als betaald gemarkeerd',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Mark invoice paid fout:', error);
    res.status(500).json({ error: error.message || 'Server fout bij markeren factuur als betaald' });
  }
});

router.delete('/:id', authenticateToken, requireRole('owner'), validateObjectId, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Factuur niet gevonden' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Betaalde facturen kunnen niet worden verwijderd' });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({ message: 'Factuur succesvol verwijderd' });
  } catch (error) {
    console.error('Delete invoice fout:', error);
    res.status(500).json({ error: 'Server fout bij verwijderen factuur' });
  }
});

module.exports = router;