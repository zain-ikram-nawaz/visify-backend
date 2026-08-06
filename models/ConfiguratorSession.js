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

// Data retention: sessions (part/variant selections + computed price) aren't
// needed once checkout happens — the authoritative order lives in Shopify's
// own Draft Order/Order — so auto-delete 90 days after creation.
configuratorSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model('ConfiguratorSession', configuratorSessionSchema);