import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: function () {
      return !this.shopDomain;
    },
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.shopDomain;
    },
  },
  // Set only for brands provisioned automatically via the Shopify app install
  // (OAuth), so a shop's Brand account never needs a separate email/password
  // signup. Non-Shopify brands (Woo/BigCommerce/standalone) leave this null.
  shopDomain: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    default: null,
  },
  plan: {
    type: String,
    enum: ['starter', 'pro', 'agency'],
    default: 'starter',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active',
  },
  apiKey: {
    type: String,
    unique: true,
  },
}, { timestamps: true });

export default mongoose.model('Brand', brandSchema);