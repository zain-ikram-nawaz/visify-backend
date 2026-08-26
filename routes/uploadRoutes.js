import express from 'express';
import { uploadModel, uploadTextureImage, uploadThumbnailImage } from '../controllers/uploadController.js';
import { upload, uploadTexture, uploadThumbnail } from '../config/cloudinary.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Protected — sirf logged in brand upload kar sake
router.post('/model', protect, upload.single('model'), uploadModel);
router.post('/texture', protect, uploadTexture.single('texture'), uploadTextureImage);
router.post('/thumbnail', protect, uploadThumbnail.single('thumbnail'), uploadThumbnailImage);

export default router;
