import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; // 👈 Import karein
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import embedRoutes from './routes/embedRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';





dotenv.config();

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Dashboard aur local ke liye credentials allow karo
  const allowedOrigins = [
    'http://localhost:3000',
    'https://visify-dashboard.vercel.app',
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Shopify aur baaki sab ke liye open
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
app.use('/api/products', productRoutes);
app.use('/api/embed', embedRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);





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