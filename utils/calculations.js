const User = require('../models/User');
const Settings = require('../models/Settings');

async function computeShares(amount, sellerId) {
  try {
    const seller = await User.findById(sellerId);
    if (!seller) {
      throw new Error('Verkoper niet gevonden');
    }

    const leader = seller.sponsorId ? await User.findById(seller.sponsorId) : null;
    const sponsor = leader && leader.sponsorId ? await User.findById(leader.sponsorId) : null;

    const settings = await Settings.findOne().sort({ createdAt: -1 });
    const shares = settings ? settings.shares : {
      seller: 0.5,
      leader: 0.10,
      sponsor: 0.10,
      fyxedMin: 0.30
    };

    const sellerShare = amount * shares.seller;
    const leaderShare = leader ? amount * shares.leader : 0;
    const sponsorShare = sponsor ? amount * shares.sponsor : 0;

    let fyxedShare = amount - (sellerShare + leaderShare + sponsorShare);
    const minFyxed = amount * shares.fyxedMin;

    if (fyxedShare < minFyxed) {
      fyxedShare = minFyxed;
    }

    return {
      seller: seller,
      leader: leader,
      sponsor: sponsor,
      sellerShare: Math.round(sellerShare * 100) / 100,
      leaderShare: Math.round(leaderShare * 100) / 100,
      sponsorShare: Math.round(sponsorShare * 100) / 100,
      fyxedShare: Math.round(fyxedShare * 100) / 100,
      leaderId: leader ? leader._id : null,
      sponsorId: sponsor ? sponsor._id : null
    };
  } catch (error) {
    throw new Error(`Fout bij berekenen commissies: ${error.message}`);
  }
}

async function calculateEarnings(userId, startDate, endDate) {
  try {
    const Sale = require('../models/Sale');

    const ownSales = await Sale.find({
      sellerId: userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] }
    });

    const leaderOverrides = await Sale.find({
      'computed.leaderId': userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] }
    });

    const sponsorOverrides = await Sale.find({
      'computed.sponsorId': userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] }
    });

    const ownSalesTotal = ownSales.reduce((sum, sale) => sum + sale.computed.sellerShare, 0);
    const leaderOverridesTotal = leaderOverrides.reduce((sum, sale) => sum + sale.computed.leaderShare, 0);
    const sponsorOverridesTotal = sponsorOverrides.reduce((sum, sale) => sum + sale.computed.sponsorShare, 0);

    return {
      ownSales: Math.round(ownSalesTotal * 100) / 100,
      overrides: Math.round((leaderOverridesTotal + sponsorOverridesTotal) * 100) / 100,
      total: Math.round((ownSalesTotal + leaderOverridesTotal + sponsorOverridesTotal) * 100) / 100,
      salesCount: ownSales.length,
      overrideCount: leaderOverrides.length + sponsorOverrides.length
    };
  } catch (error) {
    throw new Error(`Fout bij berekenen verdiensten: ${error.message}`);
  }
}

async function calculateTeamEarnings(leaderId, startDate, endDate) {
  try {
    const Sale = require('../models/Sale');

    const teamMembers = await User.find({ sponsorId: leaderId, active: true });
    const memberIds = teamMembers.map(member => member._id);

    const teamSales = await Sale.find({
      sellerId: { $in: memberIds },
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] }
    }).populate('sellerId', 'name email');

    const overrides = await Sale.find({
      'computed.leaderId': leaderId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] }
    });

    const teamTotal = teamSales.reduce((sum, sale) => sum + sale.amount, 0);
    const overridesTotal = overrides.reduce((sum, sale) => sum + sale.computed.leaderShare, 0);

    const memberBreakdown = teamMembers.map(member => {
      const memberSales = teamSales.filter(sale => sale.sellerId._id.toString() === member._id.toString());
      const memberTotal = memberSales.reduce((sum, sale) => sum + sale.amount, 0);
      const memberCommission = memberSales.reduce((sum, sale) => sum + sale.computed.sellerShare, 0);

      return {
        member: member,
        salesTotal: Math.round(memberTotal * 100) / 100,
        commission: Math.round(memberCommission * 100) / 100,
        salesCount: memberSales.length
      };
    });

    return {
      teamTotal: Math.round(teamTotal * 100) / 100,
      overridesTotal: Math.round(overridesTotal * 100) / 100,
      totalSalesCount: teamSales.length,
      memberBreakdown: memberBreakdown
    };
  } catch (error) {
    throw new Error(`Fout bij berekenen team verdiensten: ${error.message}`);
  }
}

function calculatePotential(scenario) {
  const {
    clients = 0,
    leadsPerClient = 0,
    pricePerLead = 50,
    retainers = 0,
    retainerValue = 1000,
    customCount = 0,
    customAvg = 5000
  } = scenario;

  const leadRevenue = clients * leadsPerClient * pricePerLead;
  const retainerRevenue = retainers * retainerValue;
  const customRevenue = customCount * customAvg;

  const totalRevenue = leadRevenue + retainerRevenue + customRevenue;

  const agentShare = totalRevenue * 0.5;
  const leaderShare = totalRevenue * 0.1;
  const sponsorShare = totalRevenue * 0.1;
  const fyxedShare = totalRevenue * 0.3;

  return {
    breakdown: {
      leadActivation: Math.round(leadRevenue * 100) / 100,
      retainers: Math.round(retainerRevenue * 100) / 100,
      custom: Math.round(customRevenue * 100) / 100
    },
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    shares: {
      agent: Math.round(agentShare * 100) / 100,
      leader: Math.round(leaderShare * 100) / 100,
      sponsor: Math.round(sponsorShare * 100) / 100,
      fyxed: Math.round(fyxedShare * 100) / 100
    }
  };
}

module.exports = {
  computeShares,
  calculateEarnings,
  calculateTeamEarnings,
  calculatePotential
};