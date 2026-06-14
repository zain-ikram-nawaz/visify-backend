import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  label: { type: String, required: true },
  color: { type: String, required: true },
});

const productSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  modelUrl: {
    type: String,
    required: true,
  },
  variants: [variantSchema],
  materials: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
  shopifyHandle: {
  type: String,
  default: null,
},
}, { timestamps: true });

export default mongoose.model('Product', productSchema);