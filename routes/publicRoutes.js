import express from 'express';
import { getPublicConfiguratorProductById } from '../controllers/configuratorController.js';

const router = express.Router();

// Public — authenticated via X-API-Key header, not cookie/JWT.
router.get('/products/:id', getPublicConfiguratorProductById);

export default router;
