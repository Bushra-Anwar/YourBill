import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Shop from '../models/Shop.js';
import { strictProtect } from '../middleware/authMiddleware.js';
import { JWT_SECRET } from '../config.js';

const router = express.Router();

const safeSecretMatch = (provided, expected) => {
  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

// 1. Register Shop
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, companyName, email, password, phone, gstin, address, adminBootstrapSecret } = req.body;
    if (!firstName?.trim() || !companyName?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ message: 'Name, business name, email, and a password of at least 8 characters are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const configuredAdminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const registeringAdmin = Boolean(configuredAdminEmail && normalizedEmail === configuredAdminEmail);

    if (registeringAdmin) {
      const existingAdmin = await Shop.exists({ role: 'Admin', email: configuredAdminEmail });
      if (existingAdmin) return res.status(409).json({ message: 'The administrator account is already registered.' });
      if (!process.env.ADMIN_BOOTSTRAP_SECRET || !safeSecretMatch(adminBootstrapSecret, process.env.ADMIN_BOOTSTRAP_SECRET)) {
        return res.status(403).json({ message: 'A valid administrator setup code is required for this email.' });
      }
    }

    const existingShop = await Shop.findOne({ email: normalizedEmail });
    if (existingShop) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newShop = new Shop({
      firstName: firstName.trim(),
      lastName: (lastName || '').trim(),
      companyName: companyName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: registeringAdmin ? 'Admin' : 'Client',
      phone: phone || '',
      gstin: gstin || '',
      address: address || '',
      subscriptionStatus: 'trial',
      plan: 'Professional',
      trialUsed: true,
      trialStartedAt,
      trialEndsAt
    });

    await newShop.save();

    const token = jwt.sign({ id: newShop._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Shop registered successfully',
      token,
      shop: {
        id: newShop._id,
        _id: newShop._id,
        name: [newShop.firstName, newShop.lastName].filter(Boolean).join(' '),
        firstName: newShop.firstName,
        lastName: newShop.lastName,
        companyName: newShop.companyName,
        email: newShop.email,
        phone: newShop.phone,
        gstin: newShop.gstin,
        address: newShop.address,
        subscriptionStatus: newShop.subscriptionStatus,
        plan: newShop.plan,
        trialUsed: newShop.trialUsed,
        trialStartedAt: newShop.trialStartedAt,
        trialEndsAt: newShop.trialEndsAt,
        subscriptionEndsAt: newShop.subscriptionEndsAt,
        role: newShop.role
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// 2. Login Shop
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const shop = await Shop.findOne({ email: email?.trim().toLowerCase() });
    if (!shop) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, shop.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const configuredAdminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (shop.role === 'Admin' && shop.email !== configuredAdminEmail) { shop.role = 'Client'; await shop.save(); }

    if (shop.subscriptionStatus === 'trial' && shop.trialEndsAt && shop.trialEndsAt <= new Date()) {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    } else if (shop.subscriptionStatus === 'active' && shop.subscriptionEndsAt && shop.subscriptionEndsAt <= new Date()) {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    }

    const token = jwt.sign({ id: shop._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      shop: {
        id: shop._id,
        _id: shop._id,
        name: [shop.firstName, shop.lastName].filter(Boolean).join(' '),
        firstName: shop.firstName,
        lastName: shop.lastName,
        companyName: shop.companyName,
        email: shop.email,
        phone: shop.phone,
        gstin: shop.gstin,
        address: shop.address,
        subscriptionStatus: shop.subscriptionStatus,
        plan: shop.plan,
        trialUsed: shop.trialUsed,
        trialStartedAt: shop.trialStartedAt,
        trialEndsAt: shop.trialEndsAt,
        subscriptionEndsAt: shop.subscriptionEndsAt,
        role: shop.role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// 3. Get Current Profile (with fallback to default shop context)
router.get('/me', strictProtect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.shopId).select('-password');
    if (!shop) return res.status(404).json({ message: 'Account not found.' });
    if (shop.subscriptionStatus === 'trial' && shop.trialEndsAt && shop.trialEndsAt <= new Date()) {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    } else if (shop.subscriptionStatus === 'active' && shop.subscriptionEndsAt && shop.subscriptionEndsAt <= new Date()) {
      shop.subscriptionStatus = 'expired';
      await shop.save();
    }

    res.json({
      id: shop._id,
      _id: shop._id,
      name: [shop.firstName, shop.lastName].filter(Boolean).join(' '),
      firstName: shop.firstName,
      lastName: shop.lastName,
      companyName: shop.companyName,
      email: shop.email,
      phone: shop.phone,
      gstin: shop.gstin,
      pan: shop.pan,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      pincode: shop.pincode,
      currency: shop.currency || '₹',
      subscriptionStatus: shop.subscriptionStatus,
      plan: shop.plan,
      trialUsed: shop.trialUsed,
      trialStartedAt: shop.trialStartedAt,
      trialEndsAt: shop.trialEndsAt,
      subscriptionEndsAt: shop.subscriptionEndsAt,
      role: shop.role
    });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile' });
  }
});

// 4. Update Profile
router.put('/profile', strictProtect, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'companyName', 'phone', 'gstin', 'pan', 'address', 'city', 'state', 'pincode'];
    const changes = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, String(req.body[key]).trim()]));
    const updated = await Shop.findByIdAndUpdate(req.shopId, changes, { new: true, runValidators: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'Account not found.' });
    res.json({
      ...updated.toObject(),
      name: [updated.firstName, updated.lastName].filter(Boolean).join(' '),
      role: updated.role
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/trial', strictProtect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.shopId);
    if (!shop) return res.status(404).json({ message: 'Account not found.' });
    if (shop.trialUsed) return res.status(409).json({ message: 'This account has already used its free trial.' });
    const trialStartedAt = new Date();
    shop.subscriptionStatus = 'trial';
    shop.plan = 'Professional';
    shop.trialUsed = true;
    shop.trialStartedAt = trialStartedAt;
    shop.trialEndsAt = new Date(trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    await shop.save();
    const user = shop.toObject();
    delete user.password;
    user.name = [shop.firstName, shop.lastName].filter(Boolean).join(' ');
    user.role = shop.role;
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/password', strictProtect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    const shop = await Shop.findById(req.shopId);
    if (!shop || !(await bcrypt.compare(currentPassword || '', shop.password))) return res.status(400).json({ message: 'Current password is incorrect.' });
    shop.password = await bcrypt.hash(newPassword, 10);
    await shop.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
