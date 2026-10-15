const express = require('express');
const Customer = require('../models/Customer');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'Customers retrieved successfully', customers);
  } catch (error) {
    next(error);
  }
});

router.post('/', roleMiddleware('super_admin', 'admin', 'cashier'), async (req, res, next) => {
  try {
    const { name, phone, whatsapp, email, address, gstin, customerType, creditLimit, openingBalance, notes } = req.body;
    if (!name) return sendError(res, 'Customer name is required', 400, 'VALIDATION_ERROR');

    const customer = await Customer.create({
      customerId: `CUST-${Date.now()}`,
      name,
      phone,
      whatsapp,
      email,
      address,
      gstin,
      customerType: customerType || 'retail',
      creditLimit: Number(creditLimit || 0),
      openingBalance: Number(openingBalance || 0),
      notes,
    });

    return sendSuccess(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
