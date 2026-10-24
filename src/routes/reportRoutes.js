const express = require('express');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
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
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        products,
        revenueAgg,
        todayAgg,
        monthAgg,
        bestSellerAgg,
        recentSales,
      ] = await Promise.all([
        Product.find().select('stockOnHand costPrice minimumStock').lean(),

        Sale.aggregate([
          { $group: { _id: null, sum: { $sum: '$totals.grandTotal' } } },
        ]),

        Sale.aggregate([
          { $match: { createdAt: { $gte: startOfDay } } },
          { $group: { _id: null, sum: { $sum: '$totals.grandTotal' } } },
        ]),

        Sale.aggregate([
          { $match: { createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, sum: { $sum: '$totals.grandTotal' } } },
        ]),

        Sale.aggregate([
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              qty: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            },
          },
          { $sort: { qty: -1 } },
          { $limit: 1 },
        ]),

        Sale.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('invoiceNumber customerName totals createdAt')
          .lean(),
      ]);

      const totalInventoryValue = products.reduce(
        (sum, item) => sum + (item.stockOnHand || 0) * (item.costPrice || 0),
        0
      );

      const lowStockItems = products.filter(
        (item) => (item.stockOnHand || 0) <= (item.minimumStock || 0)
      );

      return sendSuccess(res, 'Dashboard report generated successfully', {
        // Inventory
        totalProducts: products.length,
        totalInventoryValue,
        lowStockItems: lowStockItems.length,

        // Revenue
        totalRevenue: revenueAgg[0]?.sum || 0,
        todaySales:   todayAgg[0]?.sum   || 0,
        monthlySales: monthAgg[0]?.sum   || 0,

        // Best seller (may be null if no sales)
        bestSeller: bestSellerAgg[0]
          ? { name: bestSellerAgg[0].name, qty: bestSellerAgg[0].qty }
          : null,

        // Recent 5 sales
        recentSales: recentSales.map((s) => ({
          _id: s._id,
          invoiceNumber: s.invoiceNumber,
          customerName: s.customerName || 'Walk-in Customer',
          grandTotal: s.totals?.grandTotal || 0,
          createdAt: s.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;