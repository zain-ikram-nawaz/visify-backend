import Product from '../models/Product.js';

// Add Product
export const addProduct = async (req, res) => {
  try {
    const { name, modelUrl, variants, materials } = req.body;

    const product = await Product.create({
      brandId: req.brand._id,
      name,
      modelUrl,
      variants,
      materials,
    });

    res.status(201).json({
      message: 'Product added successfully',
      product,
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get All Products — brand ke saare products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ brandId: req.brand._id });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get Single Product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      brandId: req.brand._id,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};