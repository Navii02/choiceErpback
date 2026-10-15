const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    shortName: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Unit', unitSchema);
