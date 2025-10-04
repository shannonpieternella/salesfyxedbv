const express = require('express');
const router = express.Router();
const Payout = require('../models/Payout');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validatePeriod, validateObjectId } = require('../middleware/validation');
const { calculateEarnings } = require('../utils/calculations');
const moment = require('moment');

router.post('/generate', authenticateToken, requireRole('owner'), validatePeriod, async (req, res) => {
  try {
    const { month, year } = req.body;

    const targetMonth = month || moment().month() + 1;
    const targetYear = year || moment().year();

    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ error: 'Maand moet tussen 1 en 12 zijn' });
    }

    const startDate = moment().year(targetYear).month(targetMonth - 1).startOf('month').toDate();
    const endDate = moment().year(targetYear).month(targetMonth - 1).endOf('month').toDate();

    const existingPayouts = await Payout.find({
      'period.month': targetMonth,
      'period.year': targetYear
    });

    if (existingPayouts.length > 0) {
      return res.status(400).json({
        error: `Payouts voor ${targetMonth}/${targetYear} zijn al gegenereerd`
      });
    }

    const activeUsers = await User.find({ active: true });
    const payouts = [];

    for (const user of activeUsers) {
      const earnings = await calculateEarnings(user._id, startDate, endDate);

      if (earnings.total > 0) {
        const payout = new Payout({
          userId: user._id,
          period: {
            month: targetMonth,
            year: targetYear
          },
          amount: earnings.total,
          breakdown: {
            ownSales: earnings.ownSales,
            overrides: earnings.overrides
          },
          status: 'pending'
        });

        await payout.save();
        payouts.push(payout);
      }
    }

    const populatedPayouts = await Payout.find({
      'period.month': targetMonth,
      'period.year': targetYear
    }).populate('userId', 'name email role');

    res.status(201).json({
      message: `Payouts voor ${targetMonth}/${targetYear} succesvol gegenereerd`,
      payouts: populatedPayouts,
      summary: {
        totalPayouts: payouts.length,
        totalAmount: payouts.reduce((sum, payout) => sum + payout.amount, 0)
      }
    });
  } catch (error) {
    console.error('Generate payouts fout:', error);
    res.status(500).json({ error: 'Server error generating payouts' });
  }
});

router.get('/', authenticateToken, validatePeriod, async (req, res) => {
  try {
    const { month, year, userId, status } = req.query;

    let query = {};

    if (req.user.role === 'agent') {
      query.userId = req.user._id;
    } else if (req.user.role === 'leader') {
      const teamMembers = await User.find({ sponsorId: req.user._id });
      const memberIds = teamMembers.map(member => member._id);
      memberIds.push(req.user._id);
      query.userId = { $in: memberIds };
    }

    if (userId && req.user.role === 'owner') {
      query.userId = userId;
    }

    if (month && year) {
      query['period.month'] = parseInt(month);
      query['period.year'] = parseInt(year);
    }

    if (status) {
      query.status = status;
    }

    const payouts = await Payout.find(query)
      .populate('userId', 'name email role')
      .sort({ 'period.year': -1, 'period.month': -1, createdAt: -1 });

    const summary = await Payout.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    res.json({
      payouts: payouts,
      summary: summary.length > 0 ? summary[0] : {
        totalAmount: 0,
        count: 0,
        pendingAmount: 0,
        paidAmount: 0
      }
    });
  } catch (error) {
    console.error('Get payouts fout:', error);
    res.status(500).json({ error: 'Server error fetching payouts' });
  }
});

router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id)
      .populate('userId', 'name email role');

    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (req.user.role === 'agent' && payout.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'leader') {
      const targetUser = await User.findById(payout.userId._id);
      const hasAccess = payout.userId._id.toString() === req.user._id.toString() ||
                       (targetUser.sponsorId && targetUser.sponsorId.toString() === req.user._id.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ payout: payout });
  } catch (error) {
    console.error('Get payout fout:', error);
    res.status(500).json({ error: 'Server error fetching payout' });
  }
});

router.patch('/:id/mark-paid', authenticateToken, requireRole('owner'), validateObjectId, async (req, res) => {
  try {
    const { paymentReference, notes } = req.body;

    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({ error: 'Payout already marked as paid' });
    }

    payout.status = 'paid';
    if (paymentReference) payout.paymentReference = paymentReference;
    if (notes) payout.notes = notes;

    await payout.save();

    const updatedPayout = await Payout.findById(payout._id)
      .populate('userId', 'name email role');

    res.json({
      message: 'Payout succesvol als betaald gemarkeerd',
      payout: updatedPayout
    });
  } catch (error) {
    console.error('Mark payout paid fout:', error);
    res.status(500).json({ error: 'Server error marking payout as paid' });
  }
});

router.patch('/:id/status', authenticateToken, requireRole('owner'), validateObjectId, async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['pending', 'processing', 'paid', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid payout status' });
    }

    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    payout.status = status;
    if (notes) payout.notes = notes;

    await payout.save();

    const updatedPayout = await Payout.findById(payout._id)
      .populate('userId', 'name email role');

    res.json({
      message: 'Payout status succesvol bijgewerkt',
      payout: updatedPayout
    });
  } catch (error) {
    console.error('Update payout status fout:', error);
    res.status(500).json({ error: 'Server error updating payout status' });
  }
});

router.get('/export/:period', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const { period } = req.params;
    const [year, month] = period.split('-').map(Number);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid period format (use YYYY-MM)' });
    }

    const payouts = await Payout.find({
      'period.year': year,
      'period.month': month
    }).populate('userId', 'name email role');

    if (payouts.length === 0) {
      return res.status(404).json({ error: 'No payouts found for this period' });
    }

    const csvHeader = 'Naam,Email,Rol,Eigen Sales,Overrides,Totaal,Status,Betaalreferentie\n';
    const csvRows = payouts.map(payout => {
      return [
        payout.userId.name,
        payout.userId.email,
        payout.userId.role,
        payout.breakdown.ownSales.toFixed(2),
        payout.breakdown.overrides.toFixed(2),
        payout.amount.toFixed(2),
        payout.status,
        payout.paymentReference || ''
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payouts-${year}-${month.toString().padStart(2, '0')}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export payouts fout:', error);
    res.status(500).json({ error: 'Server error exporting payouts' });
  }
});

router.delete('/:id', authenticateToken, requireRole('owner'), validateObjectId, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({ error: 'Paid payouts cannot be deleted' });
    }

    await Payout.findByIdAndDelete(req.params.id);

    res.json({ message: 'Payout succesvol verwijderd' });
  } catch (error) {
    console.error('Delete payout fout:', error);
    res.status(500).json({ error: 'Server error deleting payout' });
  }
});

module.exports = router;
