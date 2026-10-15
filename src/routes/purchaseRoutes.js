const express = require('express');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware('super_admin', 'admin', 'purchase_manager', 'accountant'), async (req, res, next) => {
  try {
    return sendSuccess(res, 'Purchase records retrieved successfully', []);
  } catch (error) {
    next(error);
  }
});

router.post('/', roleMiddleware('super_admin', 'admin', 'purchase_manager'), async (req, res, next) => {
  try {
    const { supplierId, items = [] } = req.body;
    if (!supplierId || !items.length) {
      return sendError(res, 'Supplier and items are required', 400, 'VALIDATION_ERROR');
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return sendError(res, 'Supplier not found', 404, 'NOT_FOUND');

    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return sendError(res, `Product not found: ${item.productId}`, 404, 'NOT_FOUND');

      total += Number(product.costPrice || 0) * Number(item.quantity || 0);
      product.stockOnHand = (product.stockOnHand || 0) + Number(item.quantity || 0);
      await product.save();
    }

    return sendSuccess(res, 'Purchase recorded successfully', {
      purchaseNumber: `PO-${Date.now()}`,
      supplier: supplier.supplierName,
      total,
      items,
    }, 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
