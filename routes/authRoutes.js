import express from 'express';
import { register, login, logout, shopifyLink, shopifyUnlink, shopifyProductPriceUpdate, getBrandByShop, createSsoToken, consumeSsoToken } from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import internalOnly from '../middleware/internalAuth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
// Protected — sirf logged in brand access kar sake
router.get('/me', protect, (req, res) => {
  res.json({ brand: req.brand });
});

// Server-to-server only — called by the Visify Shopify app after OAuth.
router.post('/shopify/link', internalOnly, shopifyLink);
// Server-to-server only — called on shop/redact and app/uninstalled to
// permanently wipe the Brand, its ConfiguratorProducts, and Cloudinary assets.
router.post('/shopify/unlink', internalOnly, shopifyUnlink);
// Server-to-server only — called by the Visify Shopify app on products/update.
router.post('/shopify/product-price', internalOnly, shopifyProductPriceUpdate);
// Server-to-server only — read-only status lookup for the app's admin home page.
router.get('/shopify/brand/:shopDomain', internalOnly, getBrandByShop);
// Server-to-server only — mints a one-click dashboard login link for the shop.
router.post('/shopify/sso-token', internalOnly, createSsoToken);
// Public — the dashboard's /sso page exchanges the short-lived token here.
router.post('/sso/consume', consumeSsoToken);

export default router;