const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, default: '' },
    gstin: { type: String, default: '' },
    customerType: {
      type: String,
      enum: ['walk_in', 'retail', 'wholesale', 'corporate'],
      default: 'retail',
    },
    creditLimit: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ phone: 1 }, { unique: false });

module.exports = mongoose.model('Customer', customerSchema);
