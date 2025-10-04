const express = require('express');
const router = express.Router();
const VoiceCall = require('../models/VoiceCall');
const VoiceAgent = require('../models/VoiceAgent');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get user analytics (for agents)
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '30' } = req.query; // Default 30 days
    const daysBack = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get call statistics for user
    const calls = await VoiceCall.find({
      user: req.user.id,
      createdAt: { $gte: startDate },
      status: 'ended'
    }).populate('agent', 'name');

    // Calculate totals
    const totalCalls = calls.length;
    const totalMinutes = calls.reduce((sum, call) => sum + Math.ceil((call.duration || 0) / 60), 0);
    const totalCost = calls.reduce((sum, call) => sum + (call.cost || 0), 0);

    // Group by agent
    const agentStats = {};
    calls.forEach(call => {
      const agentId = call.agent?._id?.toString();
      const agentName = call.agent?.name || 'Onbekende Agent';

      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          name: agentName,
          calls: 0,
          minutes: 0,
          cost: 0
        };
      }

      agentStats[agentId].calls++;
      agentStats[agentId].minutes += Math.ceil((call.duration || 0) / 60);
      agentStats[agentId].cost += call.cost || 0;
    });

    // Group by day for chart data
    const dailyStats = {};
    calls.forEach(call => {
      const date = call.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { calls: 0, minutes: 0, cost: 0 };
      }
      dailyStats[date].calls++;
      dailyStats[date].minutes += Math.ceil((call.duration || 0) / 60);
      dailyStats[date].cost += call.cost || 0;
    });

    // Convert to arrays for charts
    const chartData = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        ...stats
      }));

    res.json({
      success: true,
      data: {
        timeframe: daysBack,
        summary: {
          totalCalls,
          totalMinutes,
          totalCost,
          averageCallDuration: totalCalls > 0 ? Math.round(totalMinutes / totalCalls * 10) / 10 : 0
        },
        agentStats: Object.values(agentStats),
        chartData,
        recentCalls: calls
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map(call => ({
            id: call._id,
            agent: call.agent?.name || 'Onbekende Agent',
            phoneNumber: call.phoneNumber,
            duration: call.duration,
            minutes: Math.ceil((call.duration || 0) / 60),
            cost: call.cost,
            status: call.status,
            createdAt: call.createdAt
          }))
      }
    });
  } catch (error) {
    console.error('Fout bij ophalen user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Kon analytics niet ophalen'
    });
  }
});

// Get admin analytics (for owners)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Alleen admins kunnen admin analytics zien'
      });
    }

    const { timeframe = '30' } = req.query;
    const daysBack = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get all calls
    const calls = await VoiceCall.find({
      createdAt: { $gte: startDate },
      status: 'ended'
    }).populate('agent', 'name').populate('user', 'name email');

    // Calculate totals
    const totalCalls = calls.length;
    const totalMinutes = calls.reduce((sum, call) => sum + Math.ceil((call.duration || 0) / 60), 0);
    const totalRevenue = calls.reduce((sum, call) => sum + (call.cost || 0), 0);

    // Group by user
    const userStats = {};
    calls.forEach(call => {
      const userId = call.user?._id?.toString();
      const userName = call.user?.name || 'Onbekende User';
      const userEmail = call.user?.email || '';

      if (!userStats[userId]) {
        userStats[userId] = {
          name: userName,
          email: userEmail,
          calls: 0,
          minutes: 0,
          cost: 0
        };
      }

      userStats[userId].calls++;
      userStats[userId].minutes += Math.ceil((call.duration || 0) / 60);
      userStats[userId].cost += call.cost || 0;
    });

    // Group by agent
    const agentStats = {};
    calls.forEach(call => {
      const agentId = call.agent?._id?.toString();
      const agentName = call.agent?.name || 'Onbekende Agent';

      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          name: agentName,
          calls: 0,
          minutes: 0,
          cost: 0
        };
      }

      agentStats[agentId].calls++;
      agentStats[agentId].minutes += Math.ceil((call.duration || 0) / 60);
      agentStats[agentId].cost += call.cost || 0;
    });

    // Group by day
    const dailyStats = {};
    calls.forEach(call => {
      const date = call.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { calls: 0, minutes: 0, cost: 0 };
      }
      dailyStats[date].calls++;
      dailyStats[date].minutes += Math.ceil((call.duration || 0) / 60);
      dailyStats[date].cost += call.cost || 0;
    });

    // Convert to arrays for charts
    const chartData = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        ...stats
      }));

    // Get unique users count
    const activeUsers = await User.countDocuments({
      _id: { $in: calls.map(call => call.user).filter(Boolean) }
    });

    // Get active agents count
    const activeAgents = await VoiceAgent.countDocuments({
      _id: { $in: calls.map(call => call.agent).filter(Boolean) }
    });

    res.json({
      success: true,
      data: {
        timeframe: daysBack,
        summary: {
          totalCalls,
          totalMinutes,
          totalRevenue,
          activeUsers,
          activeAgents,
          averageCallDuration: totalCalls > 0 ? Math.round(totalMinutes / totalCalls * 10) / 10 : 0,
          averageRevenuePerCall: totalCalls > 0 ? Math.round(totalRevenue / totalCalls * 100) / 100 : 0
        },
        userStats: Object.values(userStats)
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 20), // Top 20 users
        agentStats: Object.values(agentStats)
          .sort((a, b) => b.minutes - a.minutes),
        chartData,
        recentCalls: calls
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 20)
          .map(call => ({
            id: call._id,
            user: call.user?.name || 'Onbekende User',
            agent: call.agent?.name || 'Onbekende Agent',
            phoneNumber: call.phoneNumber,
            duration: call.duration,
            minutes: Math.ceil((call.duration || 0) / 60),
            cost: call.cost,
            status: call.status,
            createdAt: call.createdAt
          }))
      }
    });
  } catch (error) {
    console.error('Fout bij ophalen admin analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Kon admin analytics niet ophalen'
    });
  }
});

module.exports = router;