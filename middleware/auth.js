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
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedRoles = (Array.isArray(roles) ? roles : [roles]).map(r => String(r).toLowerCase());
    const normalizedAllowed = new Set(allowedRoles);
    // Map synonyms: owner -> admin, leader -> agent
    if (normalizedAllowed.has('admin')) normalizedAllowed.add('owner');
    if (normalizedAllowed.has('agent')) normalizedAllowed.add('leader');

    const userRole = String(req.user.role || '').toLowerCase();
    const effectiveRole = userRole === 'owner' ? 'admin' : userRole === 'leader' ? 'agent' : userRole;

    if (!normalizedAllowed.has(userRole) && !normalizedAllowed.has(effectiveRole)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${Array.from(new Set(allowedRoles)).join(' or ')}`
      });
    }

    next();
  };
}

function requireOwnerOrSelf(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const targetUserId = req.params.id || req.params.userId || req.body.userId;

  if (req.user.role === 'owner' || req.user._id.toString() === targetUserId) {
    return next();
  }

  return res.status(403).json({ error: 'You can only view your own data' });
}

function requireTeamAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
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
        return res.status(403).json({ error: 'You can only view your own team' });
      })
      .catch(() => {
        return res.status(403).json({ error: 'Access denied' });
      });
  } else {
    if (req.user._id.toString() === targetUserId) {
      return next();
    }
    return res.status(403).json({ error: 'You can only view your own data' });
  }
}

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requireOwnerOrSelf,
  requireTeamAccess
};
