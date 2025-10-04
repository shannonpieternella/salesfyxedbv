const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware: alle routes require auth
router.use(authenticateToken);

// Helper: build date filter
const buildDateFilter = (from, to) => {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  return filter;
};

// GET /analytics/funnel - Funnel metrics & conversions
router.get('/funnel', requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const { agentId, from, to } = req.query;

    const matchStage = { deletedAt: null, ...buildDateFilter(from, to) };

    // Admin can filter by agentId, agent sees only their own
    if (req.user.role === 'admin' && agentId) {
      matchStage.agentId = agentId;
    } else if (req.user.role === 'agent') {
      matchStage.agentId = req.user._id;
    }

    // Count per phase
    const phaseCounts = await Company.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$currentPhase',
          count: { $sum: 1 }
        }
      }
    ]);

    // Count deal results
    const dealResults = await Company.aggregate([
      { $match: { ...matchStage, 'stepState.deal.result': { $ne: null } } },
      {
        $group: {
          _id: '$stepState.deal.result',
          count: { $sum: 1 }
        }
      }
    ]);

    // Transform to object
    const phaseData = {
      leadlist: 0,
      research: 0,
      contact: 0,
      present_finetune: 0,
      deal: 0
    };

    phaseCounts.forEach(p => {
      if (phaseData[p._id] !== undefined) {
        phaseData[p._id] = p.count;
      }
    });

    const dealData = {
      WON: 0,
      LOST: 0,
      PENDING: 0
    };

    dealResults.forEach(d => {
      dealData[d._id] = d.count;
    });

    // Calculate conversion rates
    const total = Object.values(phaseData).reduce((a, b) => a + b, 0);
    const totalDeals = Object.values(dealData).reduce((a, b) => a + b, 0);

    const conversions = {
      leadlist_to_research: phaseData.leadlist > 0 ? (phaseData.research / phaseData.leadlist * 100).toFixed(2) : 0,
      research_to_contact: phaseData.research > 0 ? (phaseData.contact / phaseData.research * 100).toFixed(2) : 0,
      contact_to_present: phaseData.contact > 0 ? (phaseData.present_finetune / phaseData.contact * 100).toFixed(2) : 0,
      present_to_deal: phaseData.present_finetune > 0 ? (phaseData.deal / phaseData.present_finetune * 100).toFixed(2) : 0,
      overall_win_rate: total > 0 ? (dealData.WON / total * 100).toFixed(2) : 0
    };

    res.json({
      phaseCounts: phaseData,
      dealResults: dealData,
      conversions,
      totals: {
        total,
        totalDeals
      }
    });
  } catch (error) {
    console.error('Error fetching funnel analytics:', error);
    res.status(500).json({ error: 'Error fetching funnel analytics', details: error.message });
  }
});

// GET /analytics/durations - Average durations per phase
router.get('/durations', requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const { agentId, from, to } = req.query;

    const matchStage = { deletedAt: null, ...buildDateFilter(from, to) };

    if (req.user.role === 'admin' && agentId) {
      matchStage.agentId = agentId;
    } else if (req.user.role === 'agent') {
      matchStage.agentId = req.user._id;
    }

    const companies = await Company.find(matchStage).lean();

    // Calculate durations per phase
    const phases = ['leadlist', 'research', 'contact', 'present_finetune', 'deal'];
    const durations = {};

    phases.forEach(phase => {
      const phaseDurations = companies
        .map(c => {
          const step = c.stepState[phase];
          if (step.startedAt && step.completedAt) {
            return (new Date(step.completedAt) - new Date(step.startedAt)) / (1000 * 60 * 60 * 24); // days
          }
          return null;
        })
        .filter(d => d !== null);

      if (phaseDurations.length > 0) {
        const avg = phaseDurations.reduce((a, b) => a + b, 0) / phaseDurations.length;
        const sorted = phaseDurations.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        durations[phase] = {
          avg: avg.toFixed(2),
          median: median.toFixed(2),
          min: Math.min(...phaseDurations).toFixed(2),
          max: Math.max(...phaseDurations).toFixed(2),
          count: phaseDurations.length
        };
      } else {
        durations[phase] = {
          avg: 0,
          median: 0,
          min: 0,
          max: 0,
          count: 0
        };
      }
    });

    res.json(durations);
  } catch (error) {
    console.error('Error fetching duration analytics:', error);
    res.status(500).json({ error: 'Error fetching duration analytics', details: error.message });
  }
});

// GET /analytics/contact-methods - Contact method effectiveness
router.get('/contact-methods', requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const { agentId, from, to } = req.query;

    const matchStage = { deletedAt: null, ...buildDateFilter(from, to) };

    if (req.user.role === 'admin' && agentId) {
      matchStage.agentId = agentId;
    } else if (req.user.role === 'agent') {
      matchStage.agentId = req.user._id;
    }

    const companies = await Company.find(matchStage).lean();

    const methods = ['COLD_CALL', 'EMAIL', 'IN_PERSON'];
    const methodStats = {};

    methods.forEach(method => {
      const companiesWithMethod = companies.filter(
        c => c.stepState.contact.method === method
      );

      const attempts = companiesWithMethod.reduce((sum, c) => {
        return sum + c.stepState.contact.attempts.filter(a => a.method === method).length;
      }, 0);

      const connected = companiesWithMethod.reduce((sum, c) => {
        return sum + c.stepState.contact.attempts.filter(
          a => a.method === method && a.outcome === 'CONNECTED'
        ).length;
      }, 0);

      const won = companiesWithMethod.filter(
        c => c.stepState.deal.result === 'WON'
      ).length;

      methodStats[method] = {
        attempts,
        connected,
        connectRate: attempts > 0 ? ((connected / attempts) * 100).toFixed(2) : 0,
        companiesUsed: companiesWithMethod.length,
        won,
        winRate: companiesWithMethod.length > 0 ? ((won / companiesWithMethod.length) * 100).toFixed(2) : 0
      };
    });

    res.json(methodStats);
  } catch (error) {
    console.error('Error fetching contact method analytics:', error);
    res.status(500).json({ error: 'Error fetching contact method analytics', details: error.message });
  }
});

// GET /analytics/agents - Agent performance (admin only)
router.get('/agents', requireRole('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = buildDateFilter(from, to);

    // Robust source of agents: any user that owns companies (distinct agentId)
    const distinctAgentIds = await Company.distinct('agentId', { deletedAt: null });
    // Fallback to explicit role search if no companies yet
    const users = distinctAgentIds.length > 0
      ? await User.find({ _id: { $in: distinctAgentIds } }).lean()
      : await User.find({}).lean();

    const agentStats = await Promise.all(
      users.map(async agent => {
        const matchStage = { agentId: agent._id, deletedAt: null, ...dateFilter };
        const companies = await Company.find(matchStage).lean();

        const won = companies.filter(c => c.stepState.deal.result === 'WON').length;
        const lost = companies.filter(c => c.stepState.deal.result === 'LOST').length;

        const avgDealValue = companies
          .filter(c => c.stepState.deal.valueEUR)
          .reduce((sum, c) => sum + (c.stepState.deal.valueEUR || 0), 0) /
          (companies.filter(c => c.stepState.deal.valueEUR).length || 1);

        const cycleTimes = companies
          .filter(c => c.stepState.deal.completedAt)
          .map(c => (new Date(c.stepState.deal.completedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24));

        const avgCycleTime = cycleTimes.length > 0
          ? (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(2)
          : 0;

        return {
          agentId: agent._id,
          agentName: agent.name,
          agentEmail: agent.email,
          companiesCreated: companies.length,
          won,
          lost,
          winRate: companies.length > 0 ? ((won / companies.length) * 100).toFixed(2) : 0,
          avgDealValue: isNaN(avgDealValue) ? '0.00' : avgDealValue.toFixed(2),
          avgCycleTime
        };
      })
    );

    res.json(agentStats);
  } catch (error) {
    console.error('Error fetching agent analytics:', error);
    res.status(500).json({ error: 'Error fetching agent analytics', details: error.message });
  }
});

// GET /analytics/savings - ROI/savings hypothesis
router.get('/savings', requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const { agentId, from, to } = req.query;

    const matchStage = { deletedAt: null, ...buildDateFilter(from, to) };

    if (req.user.role === 'admin' && agentId) {
      matchStage.agentId = agentId;
    } else if (req.user.role === 'agent') {
      matchStage.agentId = req.user._id;
    }

    const companies = await Company.find(matchStage).lean();

    // Filter companies with savings data
    const withSavings = companies.filter(
      c => c.savingsHypothesis && (c.savingsHypothesis.timeHoursPerMonth || c.savingsHypothesis.costPerMonth)
    );

    const totalTimeHours = withSavings.reduce(
      (sum, c) => sum + (c.savingsHypothesis.timeHoursPerMonth || 0), 0
    );

    const totalCostEUR = withSavings.reduce(
      (sum, c) => sum + (c.savingsHypothesis.costPerMonth || 0), 0
    );

    const avgTimeHours = withSavings.length > 0 ? (totalTimeHours / withSavings.length).toFixed(2) : 0;
    const avgCostEUR = withSavings.length > 0 ? (totalCostEUR / withSavings.length).toFixed(2) : 0;

    // Savings per won deal
    const wonWithSavings = withSavings.filter(c => c.stepState.deal.result === 'WON');

    const wonTimeHours = wonWithSavings.reduce(
      (sum, c) => sum + (c.savingsHypothesis.timeHoursPerMonth || 0), 0
    );

    const wonCostEUR = wonWithSavings.reduce(
      (sum, c) => sum + (c.savingsHypothesis.costPerMonth || 0), 0
    );

    res.json({
      total: {
        companiesWithSavings: withSavings.length,
        totalTimeHoursPerMonth: totalTimeHours.toFixed(2),
        totalCostPerMonth: totalCostEUR.toFixed(2),
        avgTimeHoursPerMonth: avgTimeHours,
        avgCostPerMonth: avgCostEUR
      },
      wonDeals: {
        count: wonWithSavings.length,
        totalTimeHoursPerMonth: wonTimeHours.toFixed(2),
        totalCostPerMonth: wonCostEUR.toFixed(2),
        avgTimeHoursPerMonth: wonWithSavings.length > 0 ? (wonTimeHours / wonWithSavings.length).toFixed(2) : 0,
        avgCostPerMonth: wonWithSavings.length > 0 ? (wonCostEUR / wonWithSavings.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching savings analytics:', error);
    res.status(500).json({ error: 'Error fetching savings analytics', details: error.message });
  }
});

// GET /analytics-steps/checklist - Checklist completion analytics (per agent and overall)
router.get('/checklist', requireRole(['admin', 'agent']), async (req, res) => {
  try {
    const { agentId, from, to } = req.query;
    const matchStage = { deletedAt: null };

    // Optional date filter (by company createdAt)
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    if (req.user.role === 'admin' && agentId) {
      matchStage.agentId = agentId;
    } else if (req.user.role === 'agent') {
      matchStage.agentId = req.user._id;
    }

    // Per-agent with per-step breakdown
    const perAgent = await Company.aggregate([
      { $match: matchStage },
      { $unwind: { path: '$checklist', preserveNullAndEmptyArrays: false } },
      { $group: {
          _id: { agentId: '$agentId', stepKey: { $ifNull: ['$checklist.stepKey', 'general'] } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$checklist.checked', 1, 0] } }
        }
      },
      { $group: {
          _id: '$_id.agentId',
          steps: { $push: { stepKey: '$_id.stepKey', total: '$total', completed: '$completed' } },
          total: { $sum: '$total' },
          completed: { $sum: '$completed' }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
      { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
      { $project: {
          agentId: '$_id',
          agentName: { $ifNull: ['$agent.name', 'Unknown'] },
          agentEmail: '$agent.email',
          steps: 1,
          total: 1,
          completed: 1,
          completionRate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 0] }
        }
      }
    ]);

    // Overall by step
    const byStep = await Company.aggregate([
      { $match: matchStage },
      { $unwind: { path: '$checklist', preserveNullAndEmptyArrays: false } },
      { $group: {
          _id: { $ifNull: ['$checklist.stepKey', 'general'] },
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$checklist.checked', 1, 0] } }
        }
      },
      { $project: {
          stepKey: '$_id',
          total: 1,
          completed: 1,
          completionRate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 0] }
        }
      }
    ]);

    // Overall totals
    const totalsAgg = await Company.aggregate([
      { $match: matchStage },
      { $unwind: { path: '$checklist', preserveNullAndEmptyArrays: false } },
      { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: ['$checklist.checked', 1, 0] } } } },
      { $project: { _id: 0, total: 1, completed: 1, completionRate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 0] } } }
    ]);

    const overall = totalsAgg[0] || { total: 0, completed: 0, completionRate: 0 };

    res.json({ perAgent, byStep, overall });
  } catch (error) {
    console.error('Error fetching checklist analytics:', error);
    res.status(500).json({ error: 'Error fetching checklist analytics', details: error.message });
  }
});

module.exports = router;
