import express from 'express';
import Customer from '../models/Customer.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all customers
router.get('/', protect, async (req, res) => {
  try {
    const customers = await Customer.find({ shopId: req.shopId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new customer
router.post('/', protect, async (req, res) => {
  // Generate a customer ID if not provided
  let customerId = req.body.customerId;
  if (!customerId) {
    const count = await Customer.countDocuments({ shopId: req.shopId });
    customerId = `CUST-${(count + 1).toString().padStart(3, '0')}`;
  }

  const customer = new Customer({
    ...req.body,
    shopId: req.shopId,
    customerId
  });

  try {
    const newCustomer = await customer.save();
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a customer
router.put('/:id', protect, async (req, res) => {
  try {
    const changes = { ...req.body };
    delete changes.shopId; delete changes._id; delete changes.createdAt; delete changes.updatedAt;
    const updatedCustomer = await Customer.findOneAndUpdate({ _id: req.params.id, shopId: req.shopId }, changes, { new: true, runValidators: true });
    if (!updatedCustomer) return res.status(404).json({ message: 'Customer not found.' });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a customer
router.delete('/:id', protect, async (req, res) => {
  try {
    await Customer.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
