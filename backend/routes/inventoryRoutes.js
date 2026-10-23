import express from 'express';
import { Supplier, PurchaseOrder, Warehouse, StockMovement, BatchTracking } from '../models/InventoryModels.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to create basic CRUD routes
const createRoutes = (Model, path) => {
  router.get(path, protect, async (req, res) => {
    try {
      const data = await Model.find({ shopId: req.shopId }).sort({ createdAt: -1 });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post(path, protect, async (req, res) => {
    try {
      const newData = new Model({ ...req.body, shopId: req.shopId });
      const saved = await newData.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete(`${path}/:id`, protect, async (req, res) => {
    try {
      await Model.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};

createRoutes(Supplier, '/suppliers');
createRoutes(PurchaseOrder, '/purchases');
createRoutes(Warehouse, '/warehouses');
createRoutes(StockMovement, '/movements');
createRoutes(BatchTracking, '/batches');

export default router;
