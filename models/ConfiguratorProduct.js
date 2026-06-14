import mongoose from 'mongoose';

// ── Variant Schema ─────────────────────────────────────
// Har part ke alag variants honge — color ya texture
const variantSchema = new mongoose.Schema({
  label: { type: String, required: true },      // "Red", "Oak Wood"
  type: {
    type: String,
    enum: ['color', 'texture'],
    default: 'color'
  },
  value: { type: String, required: true },       // hex color ya texture URL
  priceModifier: { type: Number, default: 0 },   // +$50 ya -$20
  thumbnailUrl: { type: String, default: null }, // swatch image
});

// ── Part Schema ────────────────────────────────────────
// Har part ek alag 3D model hai
const partSchema = new mongoose.Schema({
  name: { type: String, required: true },         // "Wheels", "Bumper", "Roof Rack"
  description: { type: String, default: '' },     // part ki short desc
  modelUrl: { type: String, required: true },     // Cloudinary .glb URL
  thumbnailUrl: { type: String, default: null },  // part ka preview image
  isDefault: { type: Boolean, default: false },   // default selected hoga?
  isRequired: { type: Boolean, default: false },  // remove nahi ho sakta
  category: { type: String, default: 'general' }, // "exterior", "interior", "wheels"
  basePrice: { type: Number, default: 0 },        // is part ki base price
  variants: [variantSchema],                       // color/texture options
  sortOrder: { type: Number, default: 0 },        // panel mein order
});

// ── Main Configurator Product Schema ──────────────────
const configuratorProductSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },

  // ── Basic Info ──
  name: { type: String, required: true },          // "Van Builder", "Chair Studio"
  description: { type: String, default: '' },      // product description
  thumbnailUrl: { type: String, default: null },   // dashboard preview image

  // ── Shopify Link ──
  shopifyHandle: { type: String, default: null },  // auto-match Shopify product
  shopifyProductId: { type: String, default: null },

  // ── Base Model ──
  baseModelUrl: { type: String, required: true },  // main/base 3D model
  baseModelName: { type: String, default: 'Base' },
  basePrice: { type: Number, default: 0 },         // base price

  // ── Parts ──
  parts: [partSchema],                             // alag alag parts

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

export default mongoose.model('ConfiguratorProduct', configuratorProductSchema);