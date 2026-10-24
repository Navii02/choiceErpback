
const express = require('express');

const Sale = require('../models/Sale');
const mongoose = require('mongoose');
const router = express.Router();
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/pos', roleMiddleware('super_admin', 'admin', 'cashier'), async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const {
      items = [], customerId, paymentMethod = 'cash',
      clientInvoiceId, deviceId, sequence, createdAt: offlineCreatedAt,
      allowNegativeStock = false,
    } = req.body;

    if (!items.length) return sendError(res, 'At least one product is required', 400, 'VALIDATION_ERROR');
    if (!clientInvoiceId) return sendError(res, 'clientInvoiceId is required for idempotency', 400, 'MISSING_IDEMPOTENCY_KEY');

    // Idempotency: if already applied, return existing
    const existing = await Sale.findOne({ clientInvoiceId });
    if (existing) {
      return sendSuccess(res, 'Sale already recorded (idempotent)', {
        invoiceNumber: existing.invoiceNumber,
        clientInvoiceId: existing.clientInvoiceId,
        total: existing.totals.grandTotal,
        idempotent: true,
      });
    }

    let result;
    await session.withTransaction(async () => {
      let subtotal = 0;
      for (const item of items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw Object.assign(new Error(`Product not found: ${item.productId}`), { statusCode: 404 });

        const available = product.stockOnHand || 0;
        if (!allowNegativeStock && available < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { statusCode: 400, errorCode: 'INSUFFICIENT_STOCK' });
        }

        subtotal += Number(product.sellingPrice || 0) * Number(item.quantity);
        product.stockOnHand = available - Number(item.quantity);
        await product.save({ session });
      }

      const customer = customerId ? await Customer.findById(customerId).session(session) : null;
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const [sale] = await Sale.create([{
        clientInvoiceId, deviceId, sequence, invoiceNumber,
        customer: customer?._id, customerName: customer?.name || 'Walk-in Customer',
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price || 0 })),
        paymentMethod,
        totals: { subtotal, tax: 0, grandTotal: subtotal },
        offlineCreatedAt: offlineCreatedAt ? new Date(offlineCreatedAt) : null,
        createdBy: req.user._id,
      }], { session });

      result = sale;
    });

    return sendSuccess(res, 'POS sale recorded', {
      invoiceNumber: result.invoiceNumber,
      clientInvoiceId: result.clientInvoiceId,
      total: result.totals.grandTotal,
      idempotent: false,
    }, 201);
  } catch (err) {
    next(err);
  } finally {
    session.endSession();
  }
});
router.get('/', roleMiddleware('super_admin', 'admin', 'cashier', 'accountant'), async (req, res, next) => {
  const sales = await Sale.find().sort({ createdAt: -1 }).limit(500).lean();
  return sendSuccess(res, 'Sales retrieved', sales);
});
module.exports = router;   // ← THE MISSING LINE
