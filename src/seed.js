require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Unit = require('./models/Unit');
const Product = require('./models/Product');

const categories = ['Cakes', 'Pastries', 'Breads', 'Snacks', 'Cookies', 'Sweets', 'Beverages'];
const units = [
  { name: 'Piece', shortName: 'pcs' },
  { name: 'Kilogram', shortName: 'kg' },
  { name: 'Gram', shortName: 'g' },
  { name: 'Litre', shortName: 'L' },
  { name: 'Millilitre', shortName: 'ml' },
  { name: 'Box', shortName: 'box' },
  { name: 'Packet', shortName: 'pkt' },
  { name: 'Dozen', shortName: 'dz' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bakery-erp');

    await User.deleteMany({});
    await Category.deleteMany({});
    await Unit.deleteMany({});
    await Product.deleteMany({});

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'ChangeMe123!',
      role: 'super_admin',
      phone: '9999999999',
    });

    const categoryDocs = await Category.insertMany(
      categories.map((name) => ({ name, description: `${name} category` }))
    );

    const unitDocs = await Unit.insertMany(units);
    const cakeCategory = categoryDocs[0];
    const unit = unitDocs[0];

    await Product.create({
      name: 'Black Forest Cake',
      sku: 'BFC-001',
      barcode: '8901234567890',
      productType: 'finished_product',
      category: cakeCategory._id,
      unit: unit._id,
      sellingPrice: 650,
      costPrice: 420,
      tax: 5,
      minimumStock: 10,
      maximumStock: 50,
      reorderLevel: 12,
      shelfLife: 7,
      status: 'active',
      description: 'Classic bakery favourite',
      createdBy: admin._id,
      updatedBy: admin._id,
      stockOnHand: 18,
    });

    console.log('Seed complete');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed', error);
    process.exit(1);
  }
};

seed();
