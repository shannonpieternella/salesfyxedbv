const jwt = require('jsonwebtoken');
const User = require('../models/User');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Toegangstoken vereist' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Gebruiker niet gevonden of inactief' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token verlopen' });
    }
    return res.status(403).json({ error: 'Ongeldig token' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authenticatie vereist' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Toegang geweigerd. Vereiste rol: ${allowedRoles.join(' of ')}`
      });
    }

    next();
  };
}

function requireOwnerOrSelf(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authenticatie vereist' });
  }

  const targetUserId = req.params.id || req.params.userId || req.body.userId;

  if (req.user.role === 'owner' || req.user._id.toString() === targetUserId) {
    return next();
  }

  return res.status(403).json({
    error: 'Je kunt alleen je eigen gegevens bekijken'
  });
}

function requireTeamAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authenticatie vereist' });
  }

  const targetUserId = req.params.userId || req.body.sellerId;

  if (req.user.role === 'owner') {
    return next();
  }

  if (req.user.role === 'leader') {
    User.findById(targetUserId)
      .then(targetUser => {
        if (targetUser && targetUser.sponsorId &&
            targetUser.sponsorId.toString() === req.user._id.toString()) {
          return next();
        }
        if (targetUser && targetUser._id.toString() === req.user._id.toString()) {
          return next();
        }
        return res.status(403).json({
          error: 'Je kunt alleen je eigen team bekijken'
        });
      })
      .catch(() => {
        return res.status(403).json({ error: 'Toegang geweigerd' });
      });
  } else {
    if (req.user._id.toString() === targetUserId) {
      return next();
    }
    return res.status(403).json({
      error: 'Je kunt alleen je eigen gegevens bekijken'
    });
  }
}

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requireOwnerOrSelf,
  requireTeamAccess
};