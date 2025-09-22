const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, requireRole, requireOwnerOrSelf } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

// Create new user (Admin only)
router.post('/', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const { name, email, role, phone, sponsorId, canCreateTeams } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Naam, email en rol zijn vereist' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email al in gebruik' });
    }

    if (sponsorId) {
      const sponsor = await User.findById(sponsorId);
      if (!sponsor) {
        return res.status(400).json({ error: 'Sponsor niet gevonden' });
      }
    }

    // Use default password from environment
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'newuser123';

    const user = new User({
      name,
      email,
      password_hash: defaultPassword,
      role,
      phone,
      sponsorId: sponsorId || null,
      canCreateTeams: canCreateTeams || false,
      active: true
    });

    await user.save();

    res.status(201).json({
      message: 'Gebruiker succesvol aangemaakt',
      user: user,
      defaultPassword: defaultPassword
    });
  } catch (error) {
    console.error('Create user fout:', error);
    res.status(500).json({ error: 'Server fout bij aanmaken gebruiker' });
  }
});

router.get('/', authenticateToken, requireRole(['owner', 'leader']), async (req, res) => {
  try {
    const { role, active, search } = req.query;

    let query = {};

    if (req.user.role === 'leader') {
      const teamMembers = await User.find({ sponsorId: req.user._id });
      const memberIds = teamMembers.map(member => member._id);
      memberIds.push(req.user._id);
      query._id = { $in: memberIds };
    }

    if (role) {
      query.role = role;
    }

    if (active !== undefined) {
      query.active = active === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('sponsorId', 'name email role')
      .sort({ name: 1 });

    res.json({ users: users });
  } catch (error) {
    console.error('Get users fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen gebruikers' });
  }
});

router.get('/:id', authenticateToken, requireOwnerOrSelf, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('sponsorId', 'name email role');

    if (!user) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    res.json({ user: user });
  } catch (error) {
    console.error('Get user fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen gebruiker' });
  }
});

router.patch('/:id', authenticateToken, requireRole('owner'), validateObjectId, async (req, res) => {
  try {
    const { role, sponsorId, active, name, email, phone, canCreateTeams } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    if (role && !['owner', 'leader', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Ongeldige rol' });
    }

    if (sponsorId) {
      const sponsor = await User.findById(sponsorId);
      if (!sponsor) {
        return res.status(400).json({ error: 'Sponsor niet gevonden' });
      }
      if (sponsor._id.toString() === user._id.toString()) {
        return res.status(400).json({ error: 'Gebruiker kan niet zijn eigen sponsor zijn' });
      }
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email al in gebruik' });
      }
    }

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (sponsorId !== undefined) updateData.sponsorId = sponsorId;
    if (active !== undefined) updateData.active = active;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (canCreateTeams !== undefined) updateData.canCreateTeams = canCreateTeams;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('sponsorId', 'name email role');

    res.json({
      message: 'Gebruiker succesvol bijgewerkt',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user fout:', error);
    res.status(500).json({ error: 'Server fout bij bijwerken gebruiker' });
  }
});

router.get('/:id/team', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    if (req.user.role !== 'owner' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Toegang geweigerd' });
    }

    const teamMembers = await User.find({ sponsorId: req.params.id, active: true })
      .select('name email role createdAt')
      .sort({ name: 1 });

    const upline = [];
    let currentUser = user;

    while (currentUser.sponsorId) {
      const sponsor = await User.findById(currentUser.sponsorId)
        .select('name email role');
      if (sponsor) {
        upline.push(sponsor);
        currentUser = sponsor;
      } else {
        break;
      }
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      teamMembers: teamMembers,
      upline: upline.reverse()
    });
  } catch (error) {
    console.error('Get team fout:', error);
    res.status(500).json({ error: 'Server fout bij ophalen team' });
  }
});

router.delete('/:id', authenticateToken, requireRole('owner'), validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Je kunt je eigen account niet deactiveren' });
    }

    user.active = false;
    await user.save();

    res.json({ message: 'Gebruiker succesvol gedeactiveerd' });
  } catch (error) {
    console.error('Delete user fout:', error);
    res.status(500).json({ error: 'Server fout bij deactiveren gebruiker' });
  }
});

module.exports = router;