const express = require('express');
const Product = require('../models/Product');
const Sale = require('../models/Sale');                 // ← added
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/dashboard',
  roleMiddleware(
    'super_admin',
    'admin',
    'cashier',
    'production_manager',
    'purchase_manager',
    'accountant'
  ),
  async (req, res, next) => {
    try {
      const products = await Product.find();

      const totalInventoryValue = products.reduce(
        (sum, item) => sum + (item.stockOnHand || 0) * (item.costPrice || 0),
        0
      );

      const lowStockItems = products.filter(
        (item) => (item.stockOnHand || 0) <= (item.minimumStock || 0)
      );

      // Revenue comes from persisted sales, not from stock × price
      const revenueAgg = await Sale.aggregate([
        { $group: { _id: null, sum: { $sum: '$totals.grandTotal' } } },
      ]);
      const totalRevenue = revenueAgg[0]?.sum || 0;

      return sendSuccess(res, 'Dashboard report generated successfully', {
        totalProducts: products.length,
        totalInventoryValue,
        lowStockItems: lowStockItems.length,
        totalRevenue,                                   // ← number, not array
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;