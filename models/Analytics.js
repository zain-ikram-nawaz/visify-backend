import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  event: {
    type: String,
    enum: ['view', 'color_change', 'material_change', 'add_to_cart'],
    required: true,
  },
  variantSelected: {
    type: String,
    default: null,
  },
}, { timestamps: true });

export default mongoose.model('Analytics', analyticsSchema);