import Brand from '../models/Brand.js';
import ConfiguratorProduct from '../models/ConfiguratorProduct.js';
import ConsumedSsoToken from '../models/ConsumedSsoToken.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { deleteBrandAssets } from '../utils/cloudinaryCleanup.js';

// Token generate aur cookie set karne ka helper function
const sendTokenCookie = (res, brandId) => {
  const token = jwt.sign(
    // Security audit F4: purpose claim — protect() requires 'session', so the
    // short-lived SSO token (purpose 'dashboard-sso') can never be replayed as
    // a full session token.
    { id: brandId, purpose: 'session' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  };

  res.cookie('token', token, cookieOptions);
  return token;
};


// Register
export const register = async (req, res) => {
  try {
    // Security audit F14: validate types and shape at the boundary — an
    // untyped body used to reach Mongo queries as objects ({ email: { $ne: null } })
    // and bcrypt.hash(undefined) returned a 500 instead of a 400.
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const exists = await Brand.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const apiKey = 'vis_' + crypto.randomBytes(16).toString('hex');

    const brand = await Brand.create({
      name,
      email,
      password: hashed,
      apiKey,
    });

    const token = sendTokenCookie(res, brand._id);

    res.status(201).json({
      message: 'Brand registered successfully',
      token,
      brand: {
        id: brand._id,
        name: brand.name,
        email: brand.email,
        apiKey: brand.apiKey,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Login
// Security audit F27: unknown email ab bhi ek dummy hash ke against bcrypt
// compare karta hai, taake response timing se email enumeration na ho saken.
let dummyHashPromise = null;
const getDummyHash = () => {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
  }
  return dummyHashPromise;
};

export const login = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const brand = await Brand.findOne({ email });
    const isMatch = brand
      ? await bcrypt.compare(password, brand.password)
      : await bcrypt.compare(password, await getDummyHash());

    if (!brand || !isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = sendTokenCookie(res, brand._id);

    res.json({
      message: 'Login successful',
      token,
      brand: {
        id: brand._id,
        name: brand.name,
        email: brand.email,

        apiKey: brand.apiKey,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Called by the Visify Shopify app server right after OAuth completes
// (install or re-auth). Finds or creates the Brand tied to this shop domain,
// so merchants never have to sign up separately or paste an API key by hand.
export const shopifyLink = async (req, res) => {
  try {
    const { shopDomain, name } = req.body;

    if (!shopDomain) {
      return res.status(400).json({ message: 'shopDomain is required' });
    }

    let brand = await Brand.findOne({ shopDomain });

    if (!brand) {
      const apiKey = 'vis_' + crypto.randomBytes(16).toString('hex');
      brand = await Brand.create({
        name: name || shopDomain,
        shopDomain,
        apiKey,
      });
    }

    res.json({
      brandId: brand._id,
      apiKey: brand.apiKey,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Called by the Visify Shopify app on shop/redact and app/uninstalled
// webhooks — permanently wipes this shop's Brand, its ConfiguratorProducts,
// and their Cloudinary models/textures. Idempotent: a shop with no Brand
// (already wiped, or a duplicate webhook retry) is a no-op.
export const shopifyUnlink = async (req, res) => {
  try {
    const { shopDomain } = req.body;

    if (!shopDomain) {
      return res.status(400).json({ message: 'shopDomain is required' });
    }

    const brand = await Brand.findOne({ shopDomain });
    if (!brand) return res.json({ ok: true, deleted: false });

    await deleteBrandAssets(brand._id);
    await ConfiguratorProduct.deleteMany({ brandId: brand._id });
    await Brand.deleteOne({ _id: brand._id });

    res.json({ ok: true, deleted: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Called by the Visify Shopify app's products/update webhook handler
// whenever a merchant edits a linked product's price in Shopify admin —
// keeps ConfiguratorProduct.basePrice in sync without any manual re-typing.
export const shopifyProductPriceUpdate = async (req, res) => {
  try {
    const { shopDomain, shopifyProductId, price } = req.body;

    if (!shopDomain || !shopifyProductId || price == null) {
      return res.status(400).json({ message: 'shopDomain, shopifyProductId and price are required' });
    }

    const brand = await Brand.findOne({ shopDomain });
    if (!brand) return res.status(404).json({ message: 'Shop not linked yet' });

    await ConfiguratorProduct.updateMany(
      { brandId: brand._id, shopifyProductId },
      { basePrice: price },
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Server-to-server read used by the Visify Shopify app's admin home page to
// show the shop's current connection/plan status.
export const getBrandByShop = async (req, res) => {
  try {
    const { shopDomain } = req.params;
    const brand = await Brand.findOne({ shopDomain }).select('-password');

    if (!brand) {
      return res.status(404).json({ message: 'Shop not linked yet' });
    }

    res.json({
      name: brand.name,
      apiKey: brand.apiKey,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Called by the Visify Shopify app server to hand a merchant a one-click,
// password-less login into the dashboard. Short-lived (10 min) and
// single-purpose — it can only be exchanged for a real session via
// consumeSsoToken, never used as a session token itself.
export const createSsoToken = async (req, res) => {
  try {
    const { shopDomain } = req.body;

    if (!shopDomain) {
      return res.status(400).json({ message: 'shopDomain is required' });
    }

    const brand = await Brand.findOne({ shopDomain });
    if (!brand) {
      return res.status(404).json({ message: 'Shop not linked yet' });
    }

    const ssoToken = jwt.sign(
      { id: brand._id, purpose: 'dashboard-sso' },
      process.env.JWT_SECRET,
      {
        expiresIn: '10m',
        jwtid: crypto.randomUUID(),
      },
    );

    res.json({ ssoToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Public — called by the dashboard's /sso page with the token from the URL.
// Verifies it's a genuine, unexpired dashboard-sso token, then issues a
// normal 7-day session exactly like login/register would.
export const consumeSsoToken = async (req, res) => {
  try {
    const { ssoToken } = req.body;
    if (!ssoToken) {
      return res.status(400).json({ message: 'ssoToken is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(ssoToken, process.env.JWT_SECRET, {
        clockTolerance: 30,
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Login link expired — go back to Shopify admin and try again' });
      }

      return res.status(401).json({ message: 'Invalid login link — go back to Shopify admin and try again' });
    }

    if (decoded.purpose !== 'dashboard-sso') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Security audit F25: the SSO token travels in a URL query parameter, so it
    // can leak into browser history and Referer headers. Record its jti on first
    // exchange and reject any reuse — a stolen link stops working after one use.
    if (decoded.jti) {
      try {
        await ConsumedSsoToken.create({ jti: decoded.jti });
      } catch (err) {
        if (err.code === 11000) {
          return res.status(401).json({
            message: 'Login link already used — go back to Shopify admin and try again',
          });
        }
        throw err;
      }
    }

    const brand = await Brand.findById(decoded.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    const token = sendTokenCookie(res, brand._id);

    res.json({
      message: 'Login successful',
      token,
      brand: {
        id: brand._id,
        name: brand.name,
        email: brand.email,
        apiKey: brand.apiKey,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Logout
export const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

  res.cookie('token', '', {
    httpOnly: true,
    // 👈 FIX 4: Clear karne ke liye maxAge: 0 ya expires past date dono same flags ke sath hone chahiye
    maxAge: 0,
    expires: new Date(0),
    secure: true,
    sameSite: 'none',
    path: '/'
  });
  res.status(200).json({ message: 'Logged out successfully' });
};
