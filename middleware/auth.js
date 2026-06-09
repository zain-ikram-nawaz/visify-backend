import jwt from 'jsonwebtoken';
import Brand from '../models/Brand.js';

const protect = async (req, res, next) => {
  try {
    let token = req.cookies.token; // 👈 Token seedha cookie se uthayein

    if (!token) {
      return res.status(401).json({ message: 'Not authorized — no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.brand = await Brand.findById(decoded.id).select('-password');

    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

export default protect;