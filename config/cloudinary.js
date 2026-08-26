import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 3D model storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'visify-models',
    resource_type: 'raw', // .glb files ke liye zaruri
    allowed_formats: ['glb', 'gltf'],
  },
});

// Texture image storage config (variant textures — wood grain, fabric, etc.)
const textureStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'visify-textures',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

// Part thumbnail storage config
const thumbnailStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'visify-thumbnails',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const modelFileFilter = (req, file, cb) => {
  const extension = file.originalname.toLowerCase().split('.').pop();
  cb(null, ['glb', 'gltf'].includes(extension));
};

const imageFileFilter = (req, file, cb) => {
  cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype));
};

export const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: modelFileFilter });
export const uploadTexture = multer({ storage: textureStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFileFilter });
export const uploadThumbnail = multer({ storage: thumbnailStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFileFilter });
export default cloudinary;
