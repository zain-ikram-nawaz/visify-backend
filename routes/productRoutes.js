import express from 'express';
import {
  addProduct,
  getProducts,
  getProduct,
  deleteProduct,
} from '../controllers/productController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Sab routes protected hain
router.use(protect);

router.post('/', addProduct);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.delete('/:id', deleteProduct);

export default router;