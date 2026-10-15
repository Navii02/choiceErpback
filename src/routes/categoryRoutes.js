const express = require('express');
const Category = require('../models/Category');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'Categories retrieved successfully', categories);
  } catch (error) {
    next(error);
  }
});

router.post('/', roleMiddleware('super_admin', 'admin', 'purchase_manager', 'production_manager'), async (req, res, next) => {
  try {
    const { name, description, parentCategory, image, active } = req.body;
    if (!name) return sendError(res, 'Category name is required', 400, 'VALIDATION_ERROR');

    const category = await Category.create({ name, description, parentCategory, image, active: active !== false });
    return sendSuccess(res, 'Category created successfully', category, 201);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', roleMiddleware('super_admin', 'admin'), async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return sendError(res, 'Category not found', 404, 'NOT_FOUND');
    return sendSuccess(res, 'Category updated successfully', category);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
