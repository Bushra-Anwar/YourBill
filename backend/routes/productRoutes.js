import express from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all products
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ shopId: req.shopId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new product
router.post('/', protect, async (req, res) => {
  let productId = req.body.productId;
  if (!productId) {
    const count = await Product.countDocuments({ shopId: req.shopId });
    productId = `PRD-${(1000 + count + 1)}`;
  }

  // Auto-set status based on stock
  let status = req.body.status || 'Active';
  if (req.body.type === 'Physical Product' && req.body.stock <= req.body.minStock) {
    status = req.body.stock === 0 ? 'Out of Stock' : 'Low Stock';
  } else if (req.body.type === 'Service' || req.body.type === 'Subscription') {
    status = 'Active';
  }

  const product = new Product({
    ...req.body,
    shopId: req.shopId,
    productId,
    status
  });

  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a product
router.put('/:id', protect, async (req, res) => {
  try {
    let status = req.body.status;
    if (req.body.type === 'Physical Product' && req.body.stock !== undefined && req.body.minStock !== undefined) {
      if (req.body.stock === 0) status = 'Out of Stock';
      else if (req.body.stock <= req.body.minStock) status = 'Low Stock';
      else status = 'Active';
    }

    const payload = { ...req.body };
    delete payload.shopId; delete payload._id; delete payload.createdAt; delete payload.updatedAt;
    if(status) payload.status = status;

    const updatedProduct = await Product.findOneAndUpdate({ _id: req.params.id, shopId: req.shopId }, payload, { new: true, runValidators: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found.' });
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a product
router.delete('/:id', protect, async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
