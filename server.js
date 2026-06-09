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

app.use(cors({
  // 👈 Dono URLs ke aakhir se trailing slash (/) hata dein
  origin: [
    process.env.FRONTEND_URL, // Ensure karein ke .env mein bhi aakhir mein '/' na ho (e.g., https://visify.com)
    "http://localhost:5173"   // 👈 '/' hata diya
  ],
  credentials: true // Cookies exchange karne ke liye lazmi hai
}));

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
    console.log('MongoDB Connected!');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB Error:', err));