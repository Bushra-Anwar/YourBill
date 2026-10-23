import express from 'express';
import mongoose from 'mongoose';
import Shop from '../models/Shop.js';
import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';
import Expense from '../models/Expense.js';
import { strictProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

const adminOnly = async (req, res, next) => {
  try {
    const admin = await Shop.findById(req.shopId).select('email role');
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (!admin || admin.role !== 'Admin' || !configuredEmail || admin.email !== configuredEmail) {
      return res.status(403).json({ message: 'Administrator access is required.' });
    }
    req.admin = admin;
    next();
  } catch {
    res.status(500).json({ message: 'Could not verify administrator access.' });
  }
};

router.get('/shops', strictProtect, adminOnly, async (_req, res) => {
  try {
    const configuredAdminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const shops = await Shop.find({ email: { $nin: ['admin@yourbill.com', configuredAdminEmail].filter(Boolean) } }).select('-password -razorpayOrderId -pendingPlan -pendingPlanAmount -razorpayPaymentId').sort({ createdAt: -1 }).lean();
    const shopIds = shops.map(shop => shop._id);
    const [customerCounts, invoiceCounts, productCounts, paymentCounts, quoteCounts, expenseCounts] = await Promise.all([
      Customer.aggregate([{ $match: { shopId: { $in: shopIds } } }, { $group: { _id: '$shopId', count: { $sum: 1 } } }]),
      Invoice.aggregate([{ $match: { shopId: { $in: shopIds } } }, { $group: { _id: '$shopId', count: { $sum: 1 }, billed: { $sum: { $ifNull: ['$grandTotal', '$amount'] } } } }]),
      Product.aggregate([{ $match: { shopId: { $in: shopIds } } }, { $group: { _id: '$shopId', count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { shopId: { $in: shopIds } } }, { $group: { _id: '$shopId', count: { $sum: 1 }, collected: { $sum: '$amount' } } }]),
      Quotation.aggregate([{ $match: { shopId: { $in: shopIds } } }, { $group: { _id: '$shopId', count: { $sum: 1 } } }]),
      Expense.aggregate([{ $match: { shopId: { $in: shopIds } } }, { $group: { _id: '$shopId', count: { $sum: 1 }, total: { $sum: '$amount' } } }])
    ]);
    const asMap = list => new Map(list.map(entry => [String(entry._id), entry]));
    const customers = asMap(customerCounts), invoices = asMap(invoiceCounts), products = asMap(productCounts);
    const payments = asMap(paymentCounts), quotations = asMap(quoteCounts), expenses = asMap(expenseCounts);
    const now = Date.now();
    res.json(shops.map(shop => {
      const expiryDate = shop.subscriptionStatus === 'trial' ? shop.trialEndsAt : shop.subscriptionEndsAt;
      const daysUntilExpiry = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - now) / 86400000) : null;
      const subscriptionStatus = expiryDate && new Date(expiryDate).getTime() <= now && ['trial', 'active'].includes(shop.subscriptionStatus) ? 'expired' : shop.subscriptionStatus;
      return ({
      ...shop,
      subscriptionStatus,
      name: [shop.firstName, shop.lastName].filter(Boolean).join(' '),
      branches: shop.branches || [],
      daysUntilExpiry,
      renewalDueSoon: Number.isFinite(daysUntilExpiry) && daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
      metrics: {
        customers: customers.get(String(shop._id))?.count || 0,
        invoices: invoices.get(String(shop._id))?.count || 0,
        billed: invoices.get(String(shop._id))?.billed || 0,
        products: products.get(String(shop._id))?.count || 0,
        payments: payments.get(String(shop._id))?.count || 0,
        collected: payments.get(String(shop._id))?.collected || 0,
        quotations: quotations.get(String(shop._id))?.count || 0,
        expenses: expenses.get(String(shop._id))?.count || 0,
        expensesTotal: expenses.get(String(shop._id))?.total || 0
      }
    });
    }));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not load shop accounts.' });
  }
});

router.post('/shops/:shopId/branches', strictProtect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.shopId)) return res.status(400).json({ message: 'Invalid shop ID.' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Branch name is required.' });
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    const branch = { name, address: String(req.body.address || '').trim(), phone: String(req.body.phone || '').trim() };
    shop.branches.push(branch);
    await shop.save();
    res.status(201).json({ branches: shop.branches, branch: shop.branches[shop.branches.length - 1] });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Could not add this branch.' });
  }
});

router.get('/shops/:shopId/data', strictProtect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.shopId)) return res.status(400).json({ message: 'Invalid shop ID.' });
    const shop = await Shop.findById(req.params.shopId).select('-password -razorpayOrderId -pendingPlan -pendingPlanAmount -razorpayPaymentId').lean();
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    const shopId = shop._id;
    const [customers, invoices, products, payments, quotations, expenses] = await Promise.all([
      Customer.find({ shopId }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ shopId }).sort({ createdAt: -1 }).lean(),
      Product.find({ shopId }).sort({ createdAt: -1 }).lean(),
      Payment.find({ shopId }).sort({ paymentDate: -1, createdAt: -1 }).lean(),
      Quotation.find({ shopId }).sort({ createdAt: -1 }).lean(),
      Expense.find({ shopId }).sort({ date: -1, createdAt: -1 }).lean()
    ]);
    res.json({ shop, customers, invoices, products, payments, quotations, expenses });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not load this shop’s data.' });
  }
});

export default router;
