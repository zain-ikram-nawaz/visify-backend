import express from 'express';
import { uploadModel } from '../controllers/uploadController.js';
import { upload } from '../config/cloudinary.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Protected — sirf logged in brand upload kar sake
router.post('/model', protect, upload.single('model'), uploadModel);

export default router;