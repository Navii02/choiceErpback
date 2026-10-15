const express = require('express');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware('super_admin', 'admin', 'cashier', 'accountant'), async (req, res, next) => {
  try {
    return sendSuccess(res, 'Sales records retrieved successfully', []);
  } catch (error) {
    next(error);
  }
});

router.post('/pos', roleMiddleware('super_admin', 'admin', 'cashier'), async (req, res, next) => {
  try {
    const { items = [], customerId, paymentMethod = 'cash' } = req.body;

    if (!items.length) {
      return sendError(res, 'At least one product is required for a sale', 400, 'VALIDATION_ERROR');
    }

    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return sendError(res, `Product not found: ${item.productId}`, 404, 'NOT_FOUND');

      if ((product.stockOnHand || 0) < Number(item.quantity || 0)) {
        return sendError(res, `Insufficient stock for ${product.name}`, 400, 'INSUFFICIENT_STOCK');
      }

      total += Number(product.sellingPrice || 0) * Number(item.quantity || 0);
      product.stockOnHand = (product.stockOnHand || 0) - Number(item.quantity || 0);
      await product.save();
    }

    const customer = customerId ? await Customer.findById(customerId) : null;

    return sendSuccess(res, 'POS sale recorded successfully', {
      invoiceNumber: `INV-${Date.now()}`,
      customer: customer ? customer.name : 'Walk-in Customer',
      paymentMethod,
      total,
      items,
    }, 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
