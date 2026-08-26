import jwt from 'jsonwebtoken';
import Brand from '../models/Brand.js';

const protect = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    // Authorization header se token lo (cross-origin Vercel → Railway ke liye)
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized — no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Security audit F4: session tokens carry purpose 'session'. The 10-minute
    // SSO token ('dashboard-sso') shares JWT_SECRET and the id claim, so without
    // this check it would authenticate every protected route directly.
    if (decoded.purpose !== 'session') {
      return res.status(401).json({ message: 'Not authorized — invalid token' });
    }

    req.brand = await Brand.findById(decoded.id).select('-password');

    // Security audit F5: uninstalling the Shopify app deletes the Brand while
    // issued tokens stay valid for days — never continue with a null brand,
    // every controller would 500 on req.brand._id.
    if (!req.brand) {
      return res.status(401).json({ message: 'Not authorized — account no longer exists' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

export default protect;