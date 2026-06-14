import mongoose from 'mongoose';

const selectedPartSchema = new mongoose.Schema({
  partId: mongoose.Schema.Types.ObjectId,
  partName: String,
  variantId: mongoose.Schema.Types.ObjectId,
  variantLabel: String,
  variantValue: String,
  priceModifier: Number,
});

const configuratorSessionSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },
  configuratorProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConfiguratorProduct',
    required: true,
  },

  // Customer ne jo select kiya
  selectedParts: [selectedPartSchema],

  // Total price
  totalPrice: { type: Number, default: 0 },

  // Shopify order reference
  shopifyOrderId: { type: String, default: null },
  shopifyCartToken: { type: String, default: null },

  // Status
  status: {
    type: String,
    enum: ['active', 'cart', 'ordered', 'abandoned'],
    default: 'active'
  },

}, { timestamps: true });

export default mongoose.model('ConfiguratorSession', configuratorSessionSchema);