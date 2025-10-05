const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const User = require('../models/User');
const { authenticateToken, requireTeamAccess } = require('../middleware/auth');
const { validateSale, validateObjectId, validateDateRange } = require('../middleware/validation');
const { computeShares } = require('../utils/calculations');

router.post('/', authenticateToken, validateSale, async (req, res) => {
  try {
    const { sellerId, amount, currency, customer, meta } = req.body;

    if (req.user.role !== 'owner' && req.user._id.toString() !== sellerId) {
      const seller = await User.findById(sellerId);
      if (!seller || !seller.sponsorId ||
          seller.sponsorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Je kunt alleen sales registreren voor jezelf of je teamleden'
        });
      }
    }

    const calculation = await computeShares(amount, sellerId);

    const sale = new Sale({
      sellerId: sellerId,
      amount: amount,
      currency: currency || 'EUR',
      customer: customer || {},
      meta: meta || {},
      computed: {
        leaderId: calculation.leaderId,
        sponsorId: calculation.sponsorId,
        sellerShare: calculation.sellerShare,
        leaderShare: calculation.leaderShare,
        sponsorShare: calculation.sponsorShare,
        fyxedShare: calculation.fyxedShare
      },
      status: 'open'
    });

    await sale.save();

    const populatedSale = await Sale.findById(sale._id)
      .populate('sellerId', 'name email role')
      .populate('computed.leaderId', 'name email role')
      .populate('computed.sponsorId', 'name email role');

    res.status(201).json({
      message: 'Sale succesvol geregistreerd',
      sale: populatedSale,
      calculation: {
        sellerShare: calculation.sellerShare,
        leaderShare: calculation.leaderShare,
        sponsorShare: calculation.sponsorShare,
        fyxedShare: calculation.fyxedShare
      }
    });
  } catch (error) {
    console.error('Create sale fout:', error);
    res.status(500).json({ error: 'Server fout bij registreren sale' });
  }
});

router.get('/', authenticateToken, validateDateRange, async (req, res) => {
  try {
    const { sellerId, status, startDate, endDate, limit = 50, skip = 0 } = req.query;

    let query = {};

    if (req.user.role === 'agent') {
      query.sellerId = req.user._id;
    } else if (req.user.role === 'leader') {
      const teamMembers = await User.find({ sponsorId: req.user._id });
      const memberIds = teamMembers.map(member => member._id);
      memberIds.push(req.user._id);
      query.sellerId = { $in: memberIds };
    }

    if (sellerId && (req.user.role === 'owner' || req.user.role === 'admin')) {
      query.sellerId = sellerId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await Sale.find(query)
      .populate('sellerId', 'name email role')
      .populate('computed.leaderId', 'name email role')
      .populate('computed.sponsorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalCount = await Sale.countDocuments(query);

    const totalAmount = await Sale.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      sales: sales,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: totalCount > parseInt(skip) + parseInt(limit)
      },
      summary: {
        totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
        count: totalCount
      }
    });
  } catch (error) {
    console.error('Get sales fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen sales' });
  }
});

router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('sellerId', 'name email role')
      .populate('computed.leaderId', 'name email role')
      .populate('computed.sponsorId', 'name email role');

    if (!sale) {
      return res.status(404).json({ error: 'Sale niet gevonden' });
    }

    if (req.user.role === 'agent' && sale.sellerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Toegang geweigerd' });
    }

    if (req.user.role === 'leader') {
      const hasAccess = sale.sellerId._id.toString() === req.user._id.toString() ||
                       (sale.computed.leaderId && sale.computed.leaderId._id.toString() === req.user._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: 'Toegang geweigerd' });
      }
    }

    res.json({ sale: sale });
  } catch (error) {
    console.error('Get sale fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen sale' });
  }
});

router.patch('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'approved', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Ongeldige status' });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale niet gevonden' });
    }

    if (req.user.role === 'agent') {
      return res.status(403).json({ error: 'Agents kunnen status niet wijzigen' });
    }

    sale.status = status;
    await sale.save();

    const updatedSale = await Sale.findById(sale._id)
      .populate('sellerId', 'name email role')
      .populate('computed.leaderId', 'name email role')
      .populate('computed.sponsorId', 'name email role');

    res.json({
      message: 'Sale status succesvol bijgewerkt',
      sale: updatedSale
    });
  } catch (error) {
    console.error('Update sale fout:', error);
    res.status(500).json({ error: 'Server fout bij bijwerken sale' });
  }
});

router.delete('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale niet gevonden' });
    }

    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Alleen eigenaar kan sales verwijderen' });
    }

    await Sale.findByIdAndDelete(req.params.id);

    res.json({ message: 'Sale succesvol verwijderd' });
  } catch (error) {
    console.error('Delete sale fout:', error);
    res.status(500).json({ error: 'Server fout bij verwijderen sale' });
  }
});

module.exports = router;