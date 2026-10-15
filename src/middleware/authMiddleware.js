const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized', error: 'NO_TOKEN' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bakery-secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'User not authorized', error: 'INVALID_USER' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token expired or invalid', error: 'INVALID_TOKEN' });
  }
};

module.exports = authMiddleware;
