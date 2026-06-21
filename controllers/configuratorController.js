import ConfiguratorProduct from '../models/ConfiguratorProduct.js';
import ConfiguratorSession from '../models/ConfiguratorSession.js';
import Brand from '../models/Brand.js';

// ════════════════════════════════════════════════════
// PUBLIC — Viewer ke liye
// ════════════════════════════════════════════════════

// GET /api/configurator/:apiKey/:handle
// Shopify product page pe load hoga
export const getConfiguratorByHandle = async (req, res) => {
  try {
    const { apiKey, handle } = req.params;

    const brand = await Brand.findOne({ apiKey });
    if (!brand) return res.status(404).json({ message: 'Invalid API key' });

    const product = await ConfiguratorProduct.findOne({
      brandId: brand._id,
      shopifyHandle: handle,
      isActive: true,
      isPublished: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'No configurator for this product' });
    }

    res.json({
      brand: { id: brand._id, name: brand.name },
      configurator: product,
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ════════════════════════════════════════════════════
// SESSION — User ka configuration save karo
// ════════════════════════════════════════════════════

// POST /api/configurator/session
export const createSession = async (req, res) => {
  try {
    const { brandId, configuratorProductId } = req.body;

    const session = await ConfiguratorSession.create({
      brandId,
      configuratorProductId,
      selectedParts: [],
      totalPrice: 0,
      status: 'active',
    });

    res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/configurator/session/:id
// User ne koi part select kiya — update karo
export const updateSession = async (req, res) => {
  try {
    const { selectedParts, totalPrice } = req.body;

    const session = await ConfiguratorSession.findByIdAndUpdate(
      req.params.id,
      { selectedParts, totalPrice, status: 'active' },
      { new: true }
    );

    if (!session) return res.status(404).json({ message: 'Session not found' });

    res.json({ session });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/configurator/session/:id/cart
// Shopify cart mein bhejo — line item properties ke saath
export const addToCart = async (req, res) => {
  try {
    const session = await ConfiguratorSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const configurator = await ConfiguratorProduct.findById(
      session.configuratorProductId
    );

    // Shopify line item properties format
    const lineItemProperties = session.selectedParts.map((part) => ({
      name: part.partName,
      value: part.variantLabel,
    }));

    // Price bhi add karo
    lineItemProperties.push({
      name: 'Total Configuration Price',
      value: `$${session.totalPrice}`,
    });

    // Session update karo
    session.status = 'cart';
    await session.save();

    res.json({
      message: 'Cart data ready',
      shopifyCartData: {
        properties: lineItemProperties,
        totalPrice: session.totalPrice,
        configuratorProductId: configurator._id,
      },
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ════════════════════════════════════════════════════
// DASHBOARD — Brand ke liye (protected)
// ════════════════════════════════════════════════════

// POST /api/configurator/products
export const createConfiguratorProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      baseModelUrl,
      baseModelName,
      basePrice,
      shopifyHandle,
      backgroundColor,
      environmentLight,
      cameraPosition,
    } = req.body;

    const product = await ConfiguratorProduct.create({
      brandId: req.brand._id,
      name,
      description,
      baseModelUrl,
      baseModelName: baseModelName || 'Base',
      basePrice: basePrice || 0,
      shopifyHandle: shopifyHandle || null,
      backgroundColor: backgroundColor || '#0f0f0f',
      environmentLight: environmentLight || 'studio',
      cameraPosition: cameraPosition || { x: 0, y: 1, z: 3 },
      parts: [],
    });

    res.status(201).json({ message: 'Configurator created', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/configurator/products
export const getConfiguratorProducts = async (req, res) => {
  try {
    const products = await ConfiguratorProduct.find({
      brandId: req.brand._id,
    }).sort({ createdAt: -1 });

    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/configurator/products/:id
export const getConfiguratorProduct = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/configurator/products/:id
export const updateConfiguratorProduct = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOneAndUpdate(
      { _id: req.params.id, brandId: req.brand._id },
      { ...req.body },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/configurator/products/:id
export const deleteConfiguratorProduct = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOneAndDelete({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ════════════════════════════════════════════════════
// PARTS — Brand ke liye
// ════════════════════════════════════════════════════

// POST /api/configurator/products/:id/parts
export const addPart = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const {
      name,
      description,
      modelUrl,
      isDefault,
      isRequired,
      category,
      basePrice,
      sortOrder,
    } = req.body;

    product.parts.push({
      name,
      description: description || '',
      modelUrl,
      isDefault: isDefault || false,
      isRequired: isRequired || false,
      category: category || 'general',
      basePrice: basePrice || 0,
      variants: [],
      sortOrder: sortOrder || product.parts.length,
    });

    await product.save();

    res.status(201).json({
      message: 'Part added',
      product,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/configurator/products/:id/parts/:partId
export const updatePart = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const part = product.parts.id(req.params.partId);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    Object.assign(part, req.body);
    await product.save();

    res.json({ message: 'Part updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/configurator/products/:id/parts/:partId
export const deletePart = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.parts = product.parts.filter(
      (p) => p._id.toString() !== req.params.partId
    );

    await product.save();

    res.json({ message: 'Part deleted', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ════════════════════════════════════════════════════
// VARIANTS — Part ke andar
// ════════════════════════════════════════════════════

// POST /api/configurator/products/:id/parts/:partId/variants
export const addVariant = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const part = product.parts.id(req.params.partId);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    const { label, type, value, priceModifier } = req.body;

    part.variants.push({
      label,
      type: type || 'color',
      value,
      priceModifier: priceModifier || 0,
    });

    await product.save();

    res.status(201).json({ message: 'Variant added', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/configurator/products/:id/parts/:partId/variants/:variantId
export const deleteVariant = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const part = product.parts.id(req.params.partId);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    part.variants = part.variants.filter(
      (v) => v._id.toString() !== req.params.variantId
    );

    await product.save();

    res.json({ message: 'Variant deleted', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};