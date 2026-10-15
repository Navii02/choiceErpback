const express = require('express');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', roleMiddleware('super_admin', 'admin', 'cashier', 'production_manager', 'purchase_manager', 'accountant'), async (req, res, next) => {
  try {
    const products = await Product.find();
    const totalInventoryValue = products.reduce((sum, item) => sum + (item.stockOnHand || 0) * (item.costPrice || 0), 0);
    const lowStockItems = products.filter((item) => (item.stockOnHand || 0) <= (item.minimumStock || 0));

    return sendSuccess(res, 'Dashboard report generated successfully', {
      totalProducts: products.length,
      totalInventoryValue,
      lowStockItems: lowStockItems.length,
      totalRevenue: products.reduce((sum, product) => sum + (product.stockOnHand || 0) * (product.sellingPrice || 0), 0),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
