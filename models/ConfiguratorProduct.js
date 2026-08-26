import mongoose from 'mongoose';

// ── Variant Schema ─────────────────────────────────────
// Har part ke alag variants honge — color ya texture
const variantSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['color', 'texture'],
    default: 'color'
  },
  value: { type: String, required: true },
  priceModifier: { type: Number, default: 0 },
});

// ── Part Schema ────────────────────────────────────────
// Har part ek alag 3D model hai
const partSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  modelUrl: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  isRequired: { type: Boolean, default: false },
  category: { type: String, default: 'general' },
  basePrice: { type: Number, default: 0 },
  variants: [variantSchema],
  sortOrder: { type: Number, default: 0 },
});

// ── Main Configurator Product Schema ──────────────────
const configuratorProductSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },

  // ── Basic Info ──
  name: { type: String, required: true },
  description: { type: String, default: '' },

  // ── Shopify Link ──
  // shopifyHandle is the only thing the merchant types — the real product
  // identity (shopifyProductId) and basePrice are fetched from Shopify's
  // Admin API and kept in sync (see visify-backend/utils/shopifyBridge.js),
  // never typed by hand.
  shopifyHandle: { type: String, default: null },
  shopifyProductId: { type: String, default: null },

  // ── Base Model ──
  baseModelUrl: { type: String, required: true },
  baseModelName: { type: String, default: 'Base' },
  // System-set from the linked Shopify product's real admin price — see
  // shopifyBridge.getProductPrice(). Not merchant-editable.
  basePrice: { type: Number, default: 0 },

  // ── Parts ──
  parts: [partSchema],

  // ── Camera Settings ──
  cameraPosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 1 },
    z: { type: Number, default: 3 },
  },

  // ── Environment ──
  backgroundColor: { type: String, default: '#0f0f0f' },
  environmentLight: {
    type: String,
    enum: ['studio', 'outdoor', 'showroom', 'dark'],
    default: 'studio'
  },

  // ── Status ──
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },

}, { timestamps: true });

// Security audit F21: the hottest storefront query — every product page load —
// runs exactly this shape, so cover it with one compound index.
configuratorProductSchema.index({ brandId: 1, shopifyHandle: 1, isActive: 1, isPublished: 1 });

export default mongoose.model('ConfiguratorProduct', configuratorProductSchema);