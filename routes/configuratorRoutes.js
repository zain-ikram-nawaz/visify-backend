import express from 'express';
import protect from '../middleware/auth.js';
import {
  // Public
  getConfiguratorByHandle,
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

// Parts
router.post('/products/:id/parts', addPart);
router.put('/products/:id/parts/:partId', updatePart);
router.delete('/products/:id/parts/:partId', deletePart);

// Variants
router.post('/products/:id/parts/:partId/variants', addVariant);
router.delete('/products/:id/parts/:partId/variants/:variantId', deleteVariant);

export default router;