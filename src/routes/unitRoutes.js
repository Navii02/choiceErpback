const express = require('express');
const Unit = require('../models/Unit');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const units = await Unit.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'Units retrieved successfully', units);
  } catch (error) {
    next(error);
  }
});

router.post('/', roleMiddleware('super_admin', 'admin', 'production_manager', 'purchase_manager'), async (req, res, next) => {
  try {
    const { name, shortName } = req.body;
    if (!name) return sendError(res, 'Unit name is required', 400, 'VALIDATION_ERROR');

    const unit = await Unit.create({ name, shortName });
    return sendSuccess(res, 'Unit created successfully', unit, 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
