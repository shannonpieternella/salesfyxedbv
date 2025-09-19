const express = require('express');
const router = express.Router();
const { authenticateToken, requireTeamAccess } = require('../middleware/auth');
const { validateDateRange } = require('../middleware/validation');
const { calculateEarnings, calculateTeamEarnings, calculatePotential } = require('../utils/calculations');
const moment = require('moment');

router.get('/summary', authenticateToken, validateDateRange, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    let targetUserId = userId || req.user._id;

    if (req.user.role !== 'owner' && targetUserId !== req.user._id.toString()) {
      const User = require('../models/User');
      const targetUser = await User.findById(targetUserId);
      if (!targetUser || !targetUser.sponsorId ||
          targetUser.sponsorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Je kunt alleen je eigen verdiensten of die van je teamleden bekijken'
        });
      }
    }

    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();

    const earnings = await calculateEarnings(targetUserId, start, end);

    const Sale = require('../models/Sale');
    const recentSales = await Sale.find({
      sellerId: targetUserId,
      createdAt: { $gte: start, $lte: end },
      status: { $in: ['approved', 'paid'] }
    })
    .populate('sellerId', 'name email')
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({
      period: {
        startDate: start,
        endDate: end
      },
      earnings: earnings,
      recentSales: recentSales
    });
  } catch (error) {
    console.error('Get earnings summary fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen verdienstenoverzicht' });
  }
});

router.get('/team', authenticateToken, validateDateRange, async (req, res) => {
  try {
    const { leaderId, startDate, endDate } = req.query;

    let targetLeaderId = leaderId || req.user._id;

    if (req.user.role === 'agent') {
      return res.status(403).json({ error: 'Agents kunnen team verdiensten niet bekijken' });
    }

    if (req.user.role === 'leader' && targetLeaderId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Je kunt alleen je eigen team bekijken' });
    }

    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();

    const teamEarnings = await calculateTeamEarnings(targetLeaderId, start, end);

    const User = require('../models/User');
    const leader = await User.findById(targetLeaderId).select('name email role');

    res.json({
      period: {
        startDate: start,
        endDate: end
      },
      leader: leader,
      teamEarnings: teamEarnings
    });
  } catch (error) {
    console.error('Get team earnings fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen team verdiensten' });
  }
});

router.get('/breakdown', authenticateToken, validateDateRange, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    let targetUserId = userId || req.user._id;

    if (req.user.role !== 'owner' && targetUserId !== req.user._id.toString()) {
      const User = require('../models/User');
      const targetUser = await User.findById(targetUserId);
      if (!targetUser || !targetUser.sponsorId ||
          targetUser.sponsorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Toegang geweigerd' });
      }
    }

    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();

    const Sale = require('../models/Sale');

    const ownSales = await Sale.find({
      sellerId: targetUserId,
      createdAt: { $gte: start, $lte: end },
      status: { $in: ['approved', 'paid'] }
    }).populate('sellerId', 'name email');

    const leaderOverrides = await Sale.find({
      'computed.leaderId': targetUserId,
      createdAt: { $gte: start, $lte: end },
      status: { $in: ['approved', 'paid'] }
    }).populate('sellerId', 'name email');

    const sponsorOverrides = await Sale.find({
      'computed.sponsorId': targetUserId,
      createdAt: { $gte: start, $lte: end },
      status: { $in: ['approved', 'paid'] }
    }).populate('sellerId', 'name email');

    const breakdown = {
      ownSales: {
        sales: ownSales,
        totalAmount: ownSales.reduce((sum, sale) => sum + sale.amount, 0),
        totalCommission: ownSales.reduce((sum, sale) => sum + sale.computed.sellerShare, 0),
        count: ownSales.length
      },
      leaderOverrides: {
        sales: leaderOverrides,
        totalAmount: leaderOverrides.reduce((sum, sale) => sum + sale.amount, 0),
        totalCommission: leaderOverrides.reduce((sum, sale) => sum + sale.computed.leaderShare, 0),
        count: leaderOverrides.length
      },
      sponsorOverrides: {
        sales: sponsorOverrides,
        totalAmount: sponsorOverrides.reduce((sum, sale) => sum + sale.amount, 0),
        totalCommission: sponsorOverrides.reduce((sum, sale) => sum + sale.computed.sponsorShare, 0),
        count: sponsorOverrides.length
      }
    };

    const totalCommission = breakdown.ownSales.totalCommission +
                           breakdown.leaderOverrides.totalCommission +
                           breakdown.sponsorOverrides.totalCommission;

    res.json({
      period: {
        startDate: start,
        endDate: end
      },
      breakdown: breakdown,
      summary: {
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalSales: breakdown.ownSales.count + breakdown.leaderOverrides.count + breakdown.sponsorOverrides.count
      }
    });
  } catch (error) {
    console.error('Get earnings breakdown fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen verdiensten breakdown' });
  }
});

router.post('/calculate-potential', authenticateToken, async (req, res) => {
  try {
    const scenario = req.body;

    const potential = calculatePotential(scenario);

    res.json({
      scenario: scenario,
      potential: potential
    });
  } catch (error) {
    console.error('Calculate potential fout:', error);
    res.status(500).json({ error: 'Server fout bij berekenen potentieel' });
  }
});

router.get('/monthly-stats', authenticateToken, async (req, res) => {
  try {
    const { userId, year } = req.query;

    let targetUserId = userId || req.user._id;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    if (req.user.role !== 'owner' && targetUserId !== req.user._id.toString()) {
      const User = require('../models/User');
      const targetUser = await User.findById(targetUserId);
      if (!targetUser || !targetUser.sponsorId ||
          targetUser.sponsorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Toegang geweigerd' });
      }
    }

    const Sale = require('../models/Sale');

    const monthlyStats = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(targetYear, month - 1, 1);
      const endDate = new Date(targetYear, month, 0, 23, 59, 59);

      const earnings = await calculateEarnings(targetUserId, startDate, endDate);

      monthlyStats.push({
        month: month,
        year: targetYear,
        earnings: earnings
      });
    }

    const yearTotal = monthlyStats.reduce((sum, month) => sum + month.earnings.total, 0);

    res.json({
      year: targetYear,
      monthlyStats: monthlyStats,
      yearTotal: Math.round(yearTotal * 100) / 100
    });
  } catch (error) {
    console.error('Get monthly stats fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen maandelijkse statistieken' });
  }
});

module.exports = router;