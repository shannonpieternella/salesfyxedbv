const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Sale = require('../models/Sale');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { computeShares } = require('../utils/calculations');

router.get('/settings', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    let settings = await Settings.findOne().sort({ createdAt: -1 });

    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    res.json({ settings: settings });
  } catch (error) {
    console.error('Get settings fout:', error);
    res.status(500).json({ error: 'Server error fetching settings' });
  }
});

router.put('/settings', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const updateData = req.body;

    if (updateData.shares) {
      const { seller, leader, sponsor, fyxedMin } = updateData.shares;
      if (seller < 0 || seller > 1 || leader < 0 || leader > 1 ||
          sponsor < 0 || sponsor > 1 || fyxedMin < 0 || fyxedMin > 1) {
        return res.status(400).json({ error: 'Percentages must be between 0 and 1' });
      }

      if (seller + leader + sponsor > 1) {
        return res.status(400).json({
          error: 'Som van verkoper, leider en sponsor percentages kan niet meer dan 100% zijn'
        });
      }
    }

    let settings = await Settings.findOne().sort({ createdAt: -1 });

    if (!settings) {
      settings = new Settings(updateData);
    } else {
      Object.assign(settings, updateData);
    }

    await settings.save();

    res.json({
      message: 'Instellingen succesvol bijgewerkt',
      settings: settings
    });
  } catch (error) {
    console.error('Update settings fout:', error);
    res.status(500).json({ error: 'Server error updating settings' });
  }
});

router.post('/recompute-sales', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    let query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await Sale.find(query);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const sale of sales) {
      try {
        const calculation = await computeShares(sale.amount, sale.sellerId);

        sale.computed = {
          leaderId: calculation.leaderId,
          sponsorId: calculation.sponsorId,
          sellerShare: calculation.sellerShare,
          leaderShare: calculation.leaderShare,
          sponsorShare: calculation.sponsorShare,
          fyxedShare: calculation.fyxedShare
        };

        await sale.save();
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          saleId: sale._id,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Herberekening voltooid',
      summary: {
        totalSales: sales.length,
        successCount: successCount,
        errorCount: errorCount
      },
      errors: errors
    });
  } catch (error) {
    console.error('Recompute sales fout:', error);
    res.status(500).json({ error: 'Server error recalculating sales' });
  }
});

router.get('/dashboard-stats', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const totalUsers = await User.countDocuments({ active: true });

    const usersByRole = await User.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const salesStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalSales: { $sum: 1 },
          totalSellerShare: { $sum: '$computed.sellerShare' },
          totalLeaderShare: { $sum: '$computed.leaderShare' },
          totalSponsorShare: { $sum: '$computed.sponsorShare' },
          totalFyxedShare: { $sum: '$computed.fyxedShare' }
        }
      }
    ]);

    const monthlySales = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const topPerformers = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: '$sellerId',
          totalRevenue: { $sum: '$amount' },
          totalCommission: { $sum: '$computed.sellerShare' },
          salesCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    const populatedTopPerformers = await User.populate(topPerformers, {
      path: '_id',
      select: 'name email role'
    });

    res.json({
      period: { startDate: start, endDate: end },
      overview: {
        totalUsers: totalUsers,
        usersByRole: usersByRole,
        salesStats: salesStats.length > 0 ? salesStats[0] : {
          totalRevenue: 0,
          totalSales: 0,
          totalSellerShare: 0,
          totalLeaderShare: 0,
          totalSponsorShare: 0,
          totalFyxedShare: 0
        }
      },
      trends: {
        monthlySales: monthlySales
      },
      topPerformers: populatedTopPerformers
    });
  } catch (error) {
    console.error('Get dashboard stats fout:', error);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
});

router.get('/audit-log', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const recentSales = await Sale.find({})
      .populate('sellerId', 'name email role')
      .populate('computed.leaderId', 'name email role')
      .populate('computed.sponsorId', 'name email role')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const recentUsers = await User.find({})
      .populate('sponsorId', 'name email role')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json({
      recentSales: recentSales,
      recentUsers: recentUsers
    });
  } catch (error) {
    console.error('Get audit log fout:', error);
    res.status(500).json({ error: 'Server error fetching audit log' });
  }
});

router.get('/system-health', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const mongoose = require('mongoose');

    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    const totalSales = await Sale.countDocuments({});
    const totalUsers = await User.countDocuments({});

    const orphanedSales = await Sale.countDocuments({
      $or: [
        { sellerId: { $exists: false } },
        { sellerId: null }
      ]
    });

    const inactiveUsersWithSales = await Sale.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      {
        $match: {
          'seller.active': false
        }
      },
      { $count: 'count' }
    ]);

    const inconsistentCommissions = await Sale.find({
      $expr: {
        $ne: [
          { $add: ['$computed.sellerShare', '$computed.leaderShare', '$computed.sponsorShare', '$computed.fyxedShare'] },
          '$amount'
        ]
      }
    }).countDocuments();

    res.json({
      database: {
        status: dbStatus,
        collections: {
          sales: totalSales,
          users: totalUsers
        }
      },
      dataIntegrity: {
        orphanedSales: orphanedSales,
        inactiveUsersWithSales: inactiveUsersWithSales.length > 0 ? inactiveUsersWithSales[0].count : 0,
        inconsistentCommissions: inconsistentCommissions
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get system health fout:', error);
    res.status(500).json({ error: 'Server error fetching system status' });
  }
});

module.exports = router;
