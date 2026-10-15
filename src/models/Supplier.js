const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: { type: String, unique: true, trim: true },
    supplierName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gstin: { type: String, trim: true },
    pan: { type: String, trim: true },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    paymentTerms: { type: String, default: '' },
    creditLimit: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    notes: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
