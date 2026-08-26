import ConfiguratorProduct from '../models/ConfiguratorProduct.js';
import ConfiguratorSession from '../models/ConfiguratorSession.js';
import Brand from '../models/Brand.js';
import { getProductPrice, createDraftOrder } from '../utils/shopifyBridge.js';
import { destroyAsset } from '../utils/cloudinaryCleanup.js';

// ── Server-side pricing (security audit F1) ────────────────────────────
// The browser-computed totalPrice is NEVER trusted. Every part/variant id the
// client submits is validated against the ConfiguratorProduct itself and the
// total is recomputed from basePrice + part.basePrice + variant.priceModifier.
const computeSessionPricing = (configurator, submittedParts) => {
  if (!Array.isArray(submittedParts)) {
    return { error: 'selectedParts must be an array' };
  }

  const partMap = new Map(configurator.parts.map((p) => [String(p._id), p]));
  const validatedParts = [];
  let total = Number(configurator.basePrice) || 0;

  for (const submitted of submittedParts) {
    const part = partMap.get(String(submitted?.partId));
    if (!part) {
      return { error: 'One of the selected parts does not belong to this configurator' };
    }

    let variantId = null;
    let variantLabel = '';
    let variantValue = '';
    let priceModifier = 0;

    if (submitted.variantId) {
      const variant = part.variants.id(submitted.variantId);
      if (!variant) {
        return { error: 'One of the selected variants does not belong to this configurator' };
      }
      variantId = variant._id;
      variantLabel = variant.label;
      variantValue = variant.value;
      priceModifier = Number(variant.priceModifier) || 0;
    }

    total += (Number(part.basePrice) || 0) + priceModifier;

    validatedParts.push({
      partId: part._id,
      partName: part.name,
      variantId,
      variantLabel,
      variantValue,
      priceModifier,
    });
  }

  return { validatedParts, total: Math.round(total * 100) / 100 };
};

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

    /*
    if (brand.subscriptionStatus !== 'active') {
      return res.status(403).json({ message: 'Subscription inactive' });
    }
    */

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

// GET /api/configurator/by-shop/:shopDomain/:handle
// Auto-connect path used by the storefront viewer when no explicit API key
// is set on the theme block — looks the shop up directly, no copy/paste key.
export const getConfiguratorByShop = async (req, res) => {
  try {
    const { shopDomain, handle } = req.params;

    const brand = await Brand.findOne({ shopDomain });
    if (!brand) return res.status(404).json({ message: 'Shop not connected to Visify' });

    /*
    if (brand.subscriptionStatus !== 'active') {
      return res.status(403).json({ message: 'Subscription inactive' });
    }
    */

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

// GET /api/public/products/:id  (X-API-Key header)
// Used by the dashboard's own "Preview" button — lets a brand preview a
// configurator product by its Mongo ID with their API key, even before it's
// published/linked to a Shopify handle.
export const getPublicConfiguratorProductById = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ message: 'Missing X-API-Key header' });
    }

    const brand = await Brand.findOne({ apiKey });
    if (!brand) return res.status(404).json({ message: 'Invalid API key' });

    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: brand._id,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
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
    const session = await ConfiguratorSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Security audit F1: price server-side recompute — client totalPrice ignore.
    const configurator = await ConfiguratorProduct.findById(
      session.configuratorProductId
    );
    if (!configurator) return res.status(404).json({ message: 'Configurator not found' });

    const pricing = computeSessionPricing(configurator, req.body.selectedParts);
    if (pricing.error) return res.status(400).json({ message: pricing.error });

    session.selectedParts = pricing.validatedParts;
    session.totalPrice = pricing.total;
    session.status = 'active';
    await session.save();

    res.json({ session });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/configurator/session/:id/cart
// Ek Shopify Draft Order banao — line item properties ke saath, aur exact
// configured total (base + selected parts) charge karo. Koi pre-mapped
// variant ya combination-cap ki zaroorat nahi.
export const addToCart = async (req, res) => {
  try {
    const session = await ConfiguratorSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const configurator = await ConfiguratorProduct.findById(
      session.configuratorProductId
    );
    if (!configurator) return res.status(404).json({ message: 'Configurator not found' });

    const brand = await Brand.findById(session.brandId);
    if (!brand?.shopDomain) {
      return res.status(400).json({ message: 'This checkout flow requires a Shopify-linked brand' });
    }

    // Security audit F1 (critical): recompute the chargeable total from the
    // ConfiguratorProduct right now. The stored session.totalPrice was written
    // by an unauthenticated request and is never charged directly.
    const pricing = computeSessionPricing(configurator, session.selectedParts);
    if (pricing.error) return res.status(400).json({ message: pricing.error });

    session.selectedParts = pricing.validatedParts;
    session.totalPrice = pricing.total;

    // Shopify line item properties format
    const lineItemProperties = session.selectedParts.map((part) => ({
      name: part.partName,
      value: part.variantLabel,
    }));

    const title = [configurator.name, ...session.selectedParts.map((p) => p.variantLabel)]
      .filter(Boolean)
      .join(' — ');

    const invoiceUrl = await createDraftOrder(brand.shopDomain, {
      title,
      price: session.totalPrice,
      properties: lineItemProperties,
    });

    session.status = 'cart';
    await session.save();

    res.json({
      message: 'Checkout ready',
      shopifyCartData: {
        properties: lineItemProperties,
        totalPrice: session.totalPrice,
        configuratorProductId: configurator._id,
        checkoutUrl: invoiceUrl,
        isDevStub: process.env.SKIP_DRAFT_ORDER === 'true',
      },
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ════════════════════════════════════════════════════
// DASHBOARD — Brand ke liye (protected)
// ════════════════════════════════════════════════════

// Fetches the real Shopify admin price for a handle and applies it to a
// ConfiguratorProduct. Shopify-linked brands only — brands without a
// shopDomain (Woo/BigCommerce/standalone) keep whatever basePrice they set
// manually, since there's no Shopify product to sync from.
const syncPriceFromShopify = async (brand, product, shopifyHandle) => {
  if (!brand.shopDomain || !shopifyHandle) return;

  const { shopifyProductId, price } = await getProductPrice(brand.shopDomain, shopifyHandle);
  product.shopifyProductId = shopifyProductId;
  product.basePrice = price;
};

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

    const product = new ConfiguratorProduct({
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

    if (shopifyHandle) {
      await syncPriceFromShopify(req.brand, product, shopifyHandle);
    }

    await product.save();

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
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { basePrice, ...rest } = req.body;

    // Security audit F6: allowlist updatable fields. `rest` used to be applied
    // raw, so a brand could smuggle brandId (moving its product into another
    // tenant's dashboard), _id or timestamps through mass assignment.
    const allowedFields = [
      'name',
      'description',
      'shopifyHandle',
      'baseModelUrl',
      'baseModelName',
      'cameraPosition',
      'backgroundColor',
      'environmentLight',
      'isActive',
      'isPublished',
    ];
    for (const field of allowedFields) {
      if (field in rest) product[field] = rest[field];
    }
    // basePrice stays system-set for Shopify-linked brands — ignore any
    // manually-passed value there, only apply it for non-Shopify brands.
    if (!req.brand.shopDomain && basePrice !== undefined) {
      product.basePrice = basePrice;
    }

    const handleChanged = 'shopifyHandle' in rest && rest.shopifyHandle !== product.shopifyHandle;
    if (handleChanged && product.shopifyHandle) {
      await syncPriceFromShopify(req.brand, product, product.shopifyHandle);
    }

    await product.save();

    res.json({ message: 'Updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/configurator/products/:id/sync-price
// Manual "Re-sync from Shopify" button — refetches the linked product's
// current admin price on demand, instead of waiting for the webhook.
export const syncConfiguratorProductPrice = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!req.brand.shopDomain || !product.shopifyHandle) {
      return res.status(400).json({ message: 'No Shopify product linked to sync from' });
    }

    await syncPriceFromShopify(req.brand, product, product.shopifyHandle);
    await product.save();

    res.json({ message: 'Price synced', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/configurator/products/:id
export const deleteConfiguratorProduct = async (req, res) => {
  try {
    const product = await ConfiguratorProduct.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    await product.deleteOne();

    // Security audit F22: destroy the product's Cloudinary assets so storage
    // doesn't grow forever. Best-effort — failures are logged inside destroyAsset.
    const jobs = [];
    if (product.baseModelUrl) jobs.push(destroyAsset(product.baseModelUrl, 'raw'));
    for (const part of product.parts || []) {
      if (part.modelUrl) jobs.push(destroyAsset(part.modelUrl, 'raw'));
      for (const variant of part.variants || []) {
        if (variant.type === 'texture' && variant.value) {
          jobs.push(destroyAsset(variant.value, 'image'));
        }
      }
    }
    await Promise.allSettled(jobs);

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

    // Security audit F6: allowlist — never Object.assign the raw body onto a
    // subdocument (it could carry _id or unrelated fields).
    const allowedFields = [
      'name',
      'description',
      'modelUrl',
      'isDefault',
      'isRequired',
      'category',
      'basePrice',
      'sortOrder',
    ];
    for (const field of allowedFields) {
      if (field in req.body) part[field] = req.body[field];
    }
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

    const removedPart = product.parts.id(req.params.partId);

    // Security audit F22: clean up the part's Cloudinary assets before dropping it.
    if (removedPart?.modelUrl) {
      await Promise.allSettled([destroyAsset(removedPart.modelUrl, 'raw')]);
      for (const variant of removedPart.variants || []) {
        if (variant.type === 'texture' && variant.value) {
          await destroyAsset(variant.value, 'image').catch(() => {});
        }
      }
    }

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

    const removedVariant = part.variants.id(req.params.variantId);

    // Security audit F22: texture variants own a Cloudinary image — destroy it.
    if (removedVariant?.type === 'texture' && removedVariant.value) {
      await destroyAsset(removedVariant.value, 'image').catch(() => {});
    }

    part.variants = part.variants.filter(
      (v) => v._id.toString() !== req.params.variantId
    );

    await product.save();

    res.json({ message: 'Variant deleted', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};