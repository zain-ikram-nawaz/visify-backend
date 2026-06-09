import cloudinary from '../config/cloudinary.js';

export const uploadModel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    res.json({
      message: 'Model uploaded successfully',
      modelUrl: req.file.path,
      publicId: req.file.filename,
    });

  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};