const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');


router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, active: true });
    if (!user) {
      return res.status(401).json({ error: 'Ongeldige inloggegevens' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Ongeldige inloggegevens' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Succesvol ingelogd',
      user: user,
      token: token
    });
  } catch (error) {
    console.error('Login fout:', error);
    res.status(500).json({ error: 'Server fout bij inloggen' });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Succesvol uitgelogd' });
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('sponsorId', 'name email role');

    res.json({ user: user });
  } catch (error) {
    console.error('Me route fout:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Huidig en nieuw wachtwoord vereist' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nieuw wachtwoord moet minimaal 6 karakters zijn' });
    }

    const user = await User.findById(req.user._id);
    const isValidPassword = await user.comparePassword(currentPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Huidig wachtwoord incorrect' });
    }

    user.password_hash = newPassword;
    await user.save();

    res.json({ message: 'Wachtwoord succesvol gewijzigd' });
  } catch (error) {
    console.error('Wachtwoord wijziging fout:', error);
    res.status(500).json({ error: 'Server fout bij wachtwoord wijziging' });
  }
});

module.exports = router;