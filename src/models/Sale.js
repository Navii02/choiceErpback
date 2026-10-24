const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  clientInvoiceId: { type: String, required: true, unique: true, index: true }, // idempotency
  deviceId: { type: String, index: true },
  sequence: { type: Number, index: true },
  invoiceNumber: { type: String, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  items: [saleItemSchema],
  paymentMethod: { type: String, default: 'cash' },
  totals: {
    subtotal: Number, tax: Number, grandTotal: Number,
  },
  offlineCreatedAt: { type: Date },  // device clock
  syncedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

saleSchema.index({ deviceId: 1, sequence: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Sale', saleSchema);