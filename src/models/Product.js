const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, index: true },
    barcode: { type: String, trim: true, sparse: true, unique: true },
    productType: {
      type: String,
      enum: ['raw_material', 'finished_product', 'semi_finished', 'packaging', 'service'],
      default: 'finished_product',
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    sellingPrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    maximumStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    shelfLife: { type: Number, default: 0 },
    batchTracking: { type: Boolean, default: false },
    expiryTracking: { type: Boolean, default: false },
    image: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: (value) => {
          if (!value || value.startsWith('/uploads/')) return true;

          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Image must be an HTTP(S) URL or an existing uploaded-image path',
      },
    },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    stockOnHand: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
