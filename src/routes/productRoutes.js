const express = require('express');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

/* =========================================================
   GET /api/products
   Filters: category, status, productType, search
   ========================================================= */
router.get('/', async (req, res, next) => {
  try {
    const { category, status, productType, search } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (status) filters.status = status;
    if (productType) filters.productType = productType;
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filters)
      .populate('category', 'name')
      .populate('unit', 'name shortName')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Products retrieved successfully', products);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   GET /api/products/:id
   ========================================================= */
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category')
      .populate('unit');
    if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');
    return sendSuccess(res, 'Product retrieved successfully', product);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   POST /api/products
   Create product.
   Accepts: name, sku, barcode, category, unit,
            sellingPrice, costPrice, tax,
            minimumStock, maximumStock, reorderLevel,
            openingStock  ← one-time initial stockOnHand
            status, productType, description, image
   ========================================================= */
router.post(
  '/',
  roleMiddleware('super_admin', 'admin', 'cashier', 'production_manager', 'purchase_manager'),
  async (req, res, next) => {
    try {
      const {
        name,
        sku,
        barcode,
        category,
        unit,
        sellingPrice,
        costPrice,
        tax,
        minimumStock,
        maximumStock,
        reorderLevel,
        openingStock,
        status,
        productType,
        description,
        image,
      } = req.body;

      if (!name || !sku || !category || !unit) {
        return sendError(
          res,
          'Product name, SKU, category and unit are required',
          400,
          'VALIDATION_ERROR'
        );
      }

      const product = await Product.create({
        name,
        sku,
        barcode,
        category,
        unit,
        sellingPrice: Number(sellingPrice || 0),
        costPrice: Number(costPrice || 0),
        tax: Number(tax || 0),
        minimumStock: Number(minimumStock || 0),
        maximumStock: Number(maximumStock || 0),
        reorderLevel: Number(reorderLevel || 0),
        stockOnHand: Number(openingStock || 0),   // ← one-time opening stock
        status: status || 'active',
        productType: productType || 'finished_product',
        description,
        image: image || '',
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });

      return sendSuccess(res, 'Product created successfully', product, 201);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   POST /api/products/:id/image
   Upload/replace product image
   ========================================================= */
router.post(
  '/:id/image',
  roleMiddleware('super_admin', 'admin', 'production_manager', 'purchase_manager'),
  upload.single('image'),
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');

      if (!req.file) {
        return sendError(res, 'Image upload is required', 400, 'UPLOAD_REQUIRED');
      }

      product.image = `/uploads/${req.file.filename}`;
      product.updatedBy = req.user._id;
      await product.save();

      return sendSuccess(res, 'Product image uploaded successfully', product);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DELETE /api/products/:id/image
   Remove product image
   ========================================================= */
router.delete(
  '/:id/image',
  roleMiddleware('super_admin', 'admin'),
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');

      product.image = '';
      product.updatedBy = req.user._id;
      await product.save();

      return sendSuccess(res, 'Product image removed successfully', product);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PUT /api/products/:id
   Update product metadata.
   NOTE: stockOnHand is intentionally NOT writable here —
         stock changes must go through /api/inventory/adjust
         so they're auditable (sale, purchase, adjustment).
   ========================================================= */
router.put(
  '/:id',
  roleMiddleware('super_admin', 'admin', 'production_manager', 'purchase_manager'),
  async (req, res, next) => {
    try {
      // Whitelist updatable fields so callers can't sneak in stockOnHand
      const allowed = [
        'name',
        'sku',
        'barcode',
        'category',
        'unit',
        'sellingPrice',
        'costPrice',
        'tax',
        'minimumStock',
        'maximumStock',
        'reorderLevel',
        'productType',
        'status',
        'description',
        'image',
      ];

      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      updates.updatedBy = req.user._id;

      const product = await Product.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('category', 'name')
        .populate('unit', 'name shortName');

      if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');

      return sendSuccess(res, 'Product updated successfully', product);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DELETE /api/products/:id
   ========================================================= */
router.delete(
  '/:id',
  roleMiddleware('super_admin', 'admin'),
  async (req, res, next) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');
      return sendSuccess(res, 'Product deleted successfully', null);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;