const express = require('express');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', roleMiddleware('super_admin', 'admin', 'cashier', 'production_manager', 'purchase_manager', 'accountant'), async (req, res, next) => {
  try {
    const products = await Product.find().populate('category').populate('unit');
    const summary = products.map((product) => ({
      _id: product._id,
      name: product.name,
      sku: product.sku,
      stockOnHand: product.stockOnHand || 0,
      minimumStock: product.minimumStock || 0,
      category: product.category?.name || 'Uncategorized',
      status: product.status,
    }));

    return sendSuccess(res, 'Inventory summary retrieved successfully', summary);
  } catch (error) {
    next(error);
  }
});

router.post('/adjust', roleMiddleware('super_admin', 'admin', 'production_manager'), async (req, res, next) => {
  try {
    const { productId, quantity, reason } = req.body;
    if (!productId || quantity === undefined) {
      return sendError(res, 'Product and quantity are required', 400, 'VALIDATION_ERROR');
    }

    const product = await Product.findById(productId);
    if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');

    product.stockOnHand = Number(product.stockOnHand || 0) + Number(quantity);
    await product.save();

    return sendSuccess(res, 'Inventory adjusted successfully', product);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
