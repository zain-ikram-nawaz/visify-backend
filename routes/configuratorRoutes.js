import express from 'express';
import protect from '../middleware/auth.js';
import {
  // Public
  getConfiguratorByHandle,
  getConfiguratorByShop,
  // Session
  createSession,
  updateSession,
  addToCart,
  // Dashboard
  createConfiguratorProduct,
  getConfiguratorProducts,
  getConfiguratorProduct,
  updateConfiguratorProduct,
  deleteConfiguratorProduct,
  syncConfiguratorProductPrice,
  // Parts
  addPart,
  updatePart,
  deletePart,
  // Variants
  addVariant,
  deleteVariant,
} from '../controllers/configuratorController.js';

const router = express.Router();

// ── Public routes ─────────────────────────────────
// Auto-connect path used by the storefront viewer (no API key needed)
router.get('/public/by-shop/:shopDomain/:handle', getConfiguratorByShop);
router.get('/public/:apiKey/:handle', getConfiguratorByHandle);

// ── Session routes ────────────────────────────────
router.post('/session', createSession);
router.put('/session/:id', updateSession);
router.post('/session/:id/cart', addToCart);

// ── Protected — Dashboard ─────────────────────────
router.use(protect);

// Products
router.get('/products', getConfiguratorProducts);
router.post('/products', createConfiguratorProduct);
router.get('/products/:id', getConfiguratorProduct);
router.put('/products/:id', updateConfiguratorProduct);
router.delete('/products/:id', deleteConfiguratorProduct);
router.post('/products/:id/sync-price', syncConfiguratorProductPrice);

// Parts
router.post('/products/:id/parts', addPart);
router.put('/products/:id/parts/:partId', updatePart);
router.delete('/products/:id/parts/:partId', deletePart);

// Variants
router.post('/products/:id/parts/:partId/variants', addVariant);
router.delete('/products/:id/parts/:partId/variants/:variantId', deleteVariant);

export default router;