import express from 'express';
import { getEmbedData,getEmbedByHandle, trackEvent } from '../controllers/embedController.js';

const router = express.Router();

// Public route — koi bhi access kar sake
router.get('/:apiKey/:productId', getEmbedData);
router.get('/handle/:apiKey/:handle', getEmbedByHandle);
router.post('/track', trackEvent);

export default router;