const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const signToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'bakery-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Name, email, and password are required', 400, 'VALIDATION_ERROR');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 'User already exists', 409, 'DUPLICATE_USER');
    }

    const user = await User.create({ name, email, password, role: role || 'staff', phone });
    const token = signToken(user);

    return sendSuccess(res, 'User registered successfully', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
      },
      token,
    }, 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = signToken(user);

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res) => {
  return sendSuccess(res, 'Profile retrieved', { user: req.user });
};

module.exports = { register, login, getProfile };
