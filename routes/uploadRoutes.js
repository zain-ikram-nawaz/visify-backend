import express from 'express';
import { uploadModel, uploadTextureImage } from '../controllers/uploadController.js';
import { upload, uploadTexture } from '../config/cloudinary.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Protected — sirf logged in brand upload kar sake
router.post('/model', protect, upload.single('model'), uploadModel);
router.post('/texture', protect, uploadTexture.single('texture'), uploadTextureImage);

export default router;