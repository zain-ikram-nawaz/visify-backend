import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import Analytics from '../models/Analytics.js';

// Embed data fetch — viewer is API se config lega
export const getEmbedData = async (req, res) => {
  try {
    const { apiKey, productId } = req.params;

    // Brand dhundo apiKey se
    const brand = await Brand.findOne({ apiKey });
    if (!brand) {
      return res.status(404).json({ message: 'Invalid API key' });
    }

    // Subscription check
    if (brand.subscriptionStatus !== 'active') {
      return res.status(403).json({ message: 'Subscription inactive' });
    }

    // Product dhundo
    const product = await Product.findOne({
      _id: productId,
      brandId: brand._id,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Analytics — view track karo
    await Analytics.create({
      brandId: brand._id,
      productId: product._id,
      event: 'view',
    });

    res.json({
       brand: { id: brand._id, name: brand.name },
      product: {
        id: product._id,
        name: product.name,
        modelUrl: product.modelUrl,
        variants: product.variants,
        materials: product.materials,
      },
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
export const getEmbedByHandle = async (req, res) => {
  try {
    const { apiKey, handle } = req.params;

    const brand = await Brand.findOne({ apiKey });
    if (!brand) {
      return res.status(404).json({ message: 'Invalid API key' });
    }

    if (brand.subscriptionStatus !== 'active') {
      return res.status(403).json({ message: 'Subscription inactive' });
    }

    // Handle se product dhundo
    const product = await Product.findOne({
      brandId: brand._id,
      shopifyHandle: handle,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'No 3D model for this product' });
    }

    // Analytics track
    await Analytics.create({
      brandId: brand._id,
      productId: product._id,
      event: 'view',
    });

    res.json({
      brand: { id: brand._id, name: brand.name },
      product: {
        id: product._id,
        name: product.name,
        modelUrl: product.modelUrl,
        variants: product.variants,
        materials: product.materials,
      },
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// Analytics event track karne ka function
export const trackEvent = async (req, res) => {
  try {
    const { brandId, productId, event, variantSelected } = req.body;

    await Analytics.create({
      brandId,
      productId,
      event,
      variantSelected: variantSelected || null,
    });

    res.json({ message: 'Event tracked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};