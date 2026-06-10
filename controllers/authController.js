import Brand from '../models/Brand.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Token generate aur cookie set karne ka helper function
const sendTokenCookie = (res, brandId) => {
  const token = jwt.sign(
    { id: brandId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );


  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const cookieOptions = {
    // 👈 FIX 1: MaxAge use karein (Browser ke timezone ka rola khatam)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 din milliseconds mein
    httpOnly: true,
    secure: true, // 👈 FIX 2: Live (Railway) par hamesha HTTPS hota hai, isko direct true rakhein
    sameSite: 'none', // 👈 FIX 3: Cross-domain (Vercel to Railway) ke liye 'none' lazmi hai aur sath secure: true hona zaroori hai
    path: '/'
  };

  res.cookie('token', token, cookieOptions);
};


// Register
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

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

    // Secure Cookie lagayein
    sendTokenCookie(res, brand._id);

    res.status(201).json({
      message: 'Brand registered successfully',
      brand: {
        id: brand._id,
        name: brand.name,
        email: brand.email,
        plan: brand.plan,
        apiKey: brand.apiKey,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const brand = await Brand.findOne({ email });
    if (!brand) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, brand.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Secure Cookie lagayein
    sendTokenCookie(res, brand._id);

    res.json({
      message: 'Login successful',
      brand: {
        id: brand._id,
        name: brand.name,
        email: brand.email,
        plan: brand.plan,
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