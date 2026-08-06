import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; // 👈 Import karein
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import configuratorRoutes from './routes/configuratorRoutes.js';
import publicRoutes from './routes/publicRoutes.js';





dotenv.config();

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Dashboard aur local ke liye credentials allow karo — env se aata hai,
  // comma se alag multiple origins de sakte ho (e.g. dashboard + viewer preview)
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''));

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Shopify aur baaki sab ke liye open
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
app.use(cookieParser()); // 👈 Yeh middleware cookies read karne ke liye chahiye

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Visify Backend Running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/configurator', configuratorRoutes);
app.use('/api/public', publicRoutes);






// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 8080;
    console.log('MongoDB Connected!');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB Error:', err));