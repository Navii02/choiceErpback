const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Unit = require('../models/Unit');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authMiddleware);

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

router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category').populate('unit');
    if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');
    return sendSuccess(res, 'Product retrieved successfully', product);
  } catch (error) {
    next(error);
  }
});

router.post('/', roleMiddleware('super_admin', 'admin', 'cashier', 'production_manager', 'purchase_manager'), async (req, res, next) => {
  try {
    const { name, sku, barcode, category, unit, sellingPrice, costPrice, tax, minimumStock, status, productType, description, image } = req.body;

    if (!name || !sku || !category || !unit) {
      return sendError(res, 'Product name, SKU, category and unit are required', 400, 'VALIDATION_ERROR');
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
});

router.post('/:id/image', roleMiddleware('super_admin', 'admin', 'production_manager', 'purchase_manager'), upload.single('image'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');

    if (!req.file) return sendError(res, 'Image upload is required', 400, 'UPLOAD_REQUIRED');

    product.image = `/uploads/${req.file.filename}`;
    await product.save();

    return sendSuccess(res, 'Product image uploaded successfully', product);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/image', roleMiddleware('super_admin', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');

    product.image = '';
    await product.save();
    return sendSuccess(res, 'Product image removed successfully', product);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', roleMiddleware('super_admin', 'admin', 'production_manager', 'purchase_manager'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true, runValidators: true });
    if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');
    return sendSuccess(res, 'Product updated successfully', product);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', roleMiddleware('super_admin', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404, 'NOT_FOUND');
    return sendSuccess(res, 'Product deleted successfully', null);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
