const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateTeam, validateObjectId } = require('../middleware/validation');

router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = { active: true };

    if (req.user.role === 'leader') {
      query.leaderId = req.user._id;
    }

    const teams = await Team.find(query)
      .populate('leaderId', 'name email role')
      .populate('memberIds', 'name email role active')
      .sort({ name: 1 });

    res.json({ teams: teams });
  } catch (error) {
    console.error('Get teams fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen teams' });
  }
});

router.post('/', authenticateToken, requireRole(['owner', 'leader']), validateTeam, async (req, res) => {
  try {
    const { name, leaderId, memberIds, description } = req.body;

    if (req.user.role === 'leader' && leaderId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Je kunt alleen teams aanmaken waar je zelf leider van bent' });
    }

    const leader = await User.findById(leaderId);
    if (!leader || !leader.active) {
      return res.status(400).json({ error: 'Teamleider niet gevonden of inactief' });
    }

    if (memberIds && memberIds.length > 0) {
      const members = await User.find({ _id: { $in: memberIds }, active: true });
      if (members.length !== memberIds.length) {
        return res.status(400).json({ error: 'Een of meer teamleden niet gevonden of inactief' });
      }
    }

    const existingTeam = await Team.findOne({ name: name, active: true });
    if (existingTeam) {
      return res.status(400).json({ error: 'Teamnaam al in gebruik' });
    }

    const team = new Team({
      name: name,
      leaderId: leaderId,
      memberIds: memberIds || [],
      description: description || ''
    });

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('leaderId', 'name email role')
      .populate('memberIds', 'name email role active');

    res.status(201).json({
      message: 'Team succesvol aangemaakt',
      team: populatedTeam
    });
  } catch (error) {
    console.error('Create team fout:', error);
    res.status(500).json({ error: 'Server fout bij aanmaken team' });
  }
});

router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('leaderId', 'name email role')
      .populate('memberIds', 'name email role active sponsorId');

    if (!team) {
      return res.status(404).json({ error: 'Team niet gevonden' });
    }

    if (req.user.role === 'leader' && team.leaderId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Toegang geweigerd' });
    }

    const Sale = require('../models/Sale');

    const teamSales = await Sale.aggregate([
      {
        $match: {
          sellerId: { $in: team.memberIds.map(member => member._id) },
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: '$sellerId',
          totalAmount: { $sum: '$amount' },
          totalCommission: { $sum: '$computed.sellerShare' },
          salesCount: { $sum: 1 }
        }
      }
    ]);

    const memberStats = team.memberIds.map(member => {
      const stats = teamSales.find(sale => sale._id.toString() === member._id.toString());
      return {
        member: member,
        stats: stats || { totalAmount: 0, totalCommission: 0, salesCount: 0 }
      };
    });

    res.json({
      team: team,
      memberStats: memberStats
    });
  } catch (error) {
    console.error('Get team fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen team' });
  }
});

router.patch('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { name, memberIds, description } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team niet gevonden' });
    }

    if (req.user.role === 'leader' && team.leaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Je kunt alleen je eigen teams bewerken' });
    }

    if (req.user.role !== 'owner' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Alleen eigenaar en teamleiders kunnen teams bewerken' });
    }

    if (name && name !== team.name) {
      const existingTeam = await Team.findOne({
        name: name,
        active: true,
        _id: { $ne: team._id }
      });
      if (existingTeam) {
        return res.status(400).json({ error: 'Teamnaam al in gebruik' });
      }
    }

    if (memberIds && memberIds.length > 0) {
      const members = await User.find({ _id: { $in: memberIds }, active: true });
      if (members.length !== memberIds.length) {
        return res.status(400).json({ error: 'Een of meer teamleden niet gevonden of inactief' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (memberIds !== undefined) updateData.memberIds = memberIds;
    if (description !== undefined) updateData.description = description;

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('leaderId', 'name email role')
    .populate('memberIds', 'name email role active');

    res.json({
      message: 'Team succesvol bijgewerkt',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Update team fout:', error);
    res.status(500).json({ error: 'Server fout bij bijwerken team' });
  }
});

router.patch('/:id/add-member', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Gebruiker ID vereist' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team niet gevonden' });
    }

    if (req.user.role === 'leader' && team.leaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Je kunt alleen leden toevoegen aan je eigen teams' });
    }

    if (req.user.role !== 'owner' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Alleen eigenaar en teamleiders kunnen leden toevoegen' });
    }

    const user = await User.findById(userId);
    if (!user || !user.active) {
      return res.status(400).json({ error: 'Gebruiker niet gevonden of inactief' });
    }

    if (team.memberIds.includes(userId)) {
      return res.status(400).json({ error: 'Gebruiker is al lid van dit team' });
    }

    team.memberIds.push(userId);
    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate('leaderId', 'name email role')
      .populate('memberIds', 'name email role active');

    res.json({
      message: 'Teamlid succesvol toegevoegd',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Add team member fout:', error);
    res.status(500).json({ error: 'Server fout bij toevoegen teamlid' });
  }
});

router.patch('/:id/remove-member', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Gebruiker ID vereist' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team niet gevonden' });
    }

    if (req.user.role === 'leader' && team.leaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Je kunt alleen leden verwijderen uit je eigen teams' });
    }

    if (req.user.role !== 'owner' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Alleen eigenaar en teamleiders kunnen leden verwijderen' });
    }

    if (!team.memberIds.includes(userId)) {
      return res.status(400).json({ error: 'Gebruiker is geen lid van dit team' });
    }

    team.memberIds = team.memberIds.filter(id => id.toString() !== userId);
    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate('leaderId', 'name email role')
      .populate('memberIds', 'name email role active');

    res.json({
      message: 'Teamlid succesvol verwijderd',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Remove team member fout:', error);
    res.status(500).json({ error: 'Server fout bij verwijderen teamlid' });
  }
});

router.delete('/:id', authenticateToken, requireRole('owner'), validateObjectId, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team niet gevonden' });
    }

    team.active = false;
    await team.save();

    res.json({ message: 'Team succesvol gedeactiveerd' });
  } catch (error) {
    console.error('Delete team fout:', error);
    res.status(500).json({ error: 'Server fout bij deactiveren team' });
  }
});

module.exports = router;