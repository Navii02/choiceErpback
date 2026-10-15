const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, 'Users retrieved successfully', users);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.email || !payload.password || !payload.name) {
      return sendError(res, 'Name, email and password are required', 400, 'VALIDATION_ERROR');
    }

    const existing = await User.findOne({ email: payload.email.toLowerCase() });
    if (existing) {
      return sendError(res, 'User already exists', 409, 'DUPLICATE_USER');
    }

    const user = await User.create(payload);
    return sendSuccess(res, 'User created successfully', user, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createUser };
