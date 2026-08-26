import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet'; // Security audit F13
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; // 👈 Import karein
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import configuratorRoutes from './routes/configuratorRoutes.js';
import publicRoutes from './routes/publicRoutes.js';





dotenv.config();

// Security audit F3: checkout stub + production together must never pass
// silently. Shopify's Protected Customer Data review is still pending, so the
// stub is currently intentional — but it now announces itself loudly at boot.
if (process.env.NODE_ENV === 'production' && process.env.SKIP_DRAFT_ORDER === 'true') {
  console.warn(
    '\n' +
    '⚠️  WARNING: SKIP_DRAFT_ORDER=true while NODE_ENV=production.\n' +
    '⚠️  Add to Cart will NOT create real Shopify Draft Orders — customers get\n' +
    '⚠️  an empty cart. Remove SKIP_DRAFT_ORDER once the Shopify review passes.\n'
  );
}

const app = express();

// Security audit F13: baseline security headers on every API response.
app.use(helmet());

const defaultAllowedOrigins = [
  'https://dashboard.zingcalc.com',
  'https://viewer.zingcalc.com',
  'http://localhost:3001',
  'http://localhost:4173',
  'http://localhost:5173',
];
const configuredAllowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);
const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...configuredAllowedOrigins,
]);
const isShopifyStoreOrigin = (origin) =>
  /^https:\/\/[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(origin || '');

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Security audit F12: every response varies by Origin so a shared cache can
  // never serve one origin's CORS headers to another.
  res.setHeader('Vary', 'Origin');

  if (allowedOrigins.has(origin) || isShopifyStoreOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (
    req.method === 'GET' &&
    (req.path.startsWith('/api/public/') || req.path.startsWith('/api/configurator/'))
  ) {
    // Genuinely public, uncredentialed storefront reads only. Everything else
    // gets NO Access-Control-Allow-Origin header at all — with credentials in
    // play, reflecting '*' was equivalent to allowing every origin.
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Purana cors() hata do — yeh custom middleware use karo
app.use(express.json());

// Keep API parse failures JSON-shaped. Without this handler Express returns
// an HTML error page, which makes dashboard Axios calls fail with
// "Unexpected token '<'" when a request body is malformed.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON request body" });
  }
  return next(err);
});
app.use(cookieParser()); // 👈 Yeh middleware cookies read karne ke liye chahiye

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Visify Backend Running on CICD Pipeline!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/configurator', configuratorRoutes);
app.use('/api/public', publicRoutes);






// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || 'visify',
  })
  .then(() => {
    const PORT = process.env.PORT || 8080;
    console.log('MongoDB Connected!');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB Error:', err));
