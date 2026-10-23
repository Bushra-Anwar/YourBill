import jwt from 'jsonwebtoken';
import Shop from '../models/Shop.js';
import { JWT_SECRET } from '../config.js';

// Resilient auth middleware: attaches shopId whether authenticated or working in workspace demo session
export const strictProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.shopId = decoded.id;
      return next();
    } catch {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, token required' });
};

// Business data must always be scoped to the authenticated account.
export const protect = strictProtect;

const planRanks = { starter: 1, professional: 2, enterprise: 3, 'enterprise pro': 3 };
export const requirePlan = minimumPlan => async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.shopId).select('email role plan subscriptionStatus trialEndsAt subscriptionEndsAt');
    if (!shop) return res.status(401).json({ message: 'Account not found.' });
    if (shop.role === 'Admin') return next();
    const rank = planRanks[String(shop.plan || '').toLowerCase()] || 1;
    const minimumRank = planRanks[String(minimumPlan || '').toLowerCase()] || 1;
    if (shop.subscriptionStatus === 'trial' && shop.trialEndsAt && shop.trialEndsAt <= new Date()) {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    } else if (shop.subscriptionStatus === 'active' && shop.subscriptionEndsAt && shop.subscriptionEndsAt <= new Date()) {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    }
    if (shop.subscriptionStatus === 'expired' || shop.subscriptionStatus === 'pending') {
      return res.status(402).json({ message: 'Your subscription has expired. Choose a plan to continue.' });
    }
    if (rank < minimumRank) return res.status(403).json({ message: `This feature requires the ${minimumPlan} plan.` });
    req.shop = shop;
    next();
  } catch {
    res.status(500).json({ message: 'Could not verify your subscription.' });
  }
};
