import express from 'express';
import { register, login, logout } from '../controllers/authController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
// Protected — sirf logged in brand access kar sake
router.get('/me', protect, (req, res) => {
  res.json({ brand: req.brand });
});

export default router;