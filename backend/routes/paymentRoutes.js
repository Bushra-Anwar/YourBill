import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Shop from '../models/Shop.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { protect, strictProtect } from '../middleware/authMiddleware.js';

const router = express.Router();
const subscriptionPlans = { Starter: 999, Professional: 2999, Enterprise: 9999 };

let razorpay = null;
const getRazorpay = () => {
  if (razorpay) return razorpay;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  return razorpay;
};

// 1. Get all payments
router.get('/', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ shopId: req.shopId }).sort({ paymentDate: -1, createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Record manual payment (Cash, UPI, Card, Net Banking)
router.post('/record', protect, async (req, res) => {
  try {
    const { invoiceId, invoiceNumber, customerName, amount, paymentMethod = 'Cash', reference = '', notes = '' } = req.body;
    const payAmt = parseFloat(amount) || 0;
    if (!Number.isFinite(payAmt) || payAmt <= 0) return res.status(400).json({ message: 'Payment amount must be greater than zero.' });

    let targetInvoice = null;
    if (invoiceId) {
      targetInvoice = await Invoice.findOne({ _id: invoiceId, shopId: req.shopId });
    } else if (invoiceNumber) {
      targetInvoice = await Invoice.findOne({ invoiceNumber, shopId: req.shopId });
    }

    if ((invoiceId || invoiceNumber) && !targetInvoice) return res.status(404).json({ message: 'Invoice not found.' });
    if (targetInvoice && payAmt > Math.max(0, (targetInvoice.grandTotal || 0) - (targetInvoice.paidAmount || 0))) {
      return res.status(400).json({ message: 'Payment cannot exceed the invoice balance.' });
    }

    if (targetInvoice) {
      const newPaid = (targetInvoice.paidAmount || 0) + payAmt;
      const newBalance = Math.max(0, targetInvoice.grandTotal - newPaid);
      targetInvoice.paidAmount = newPaid;
      targetInvoice.balanceAmount = newBalance;
      targetInvoice.paymentStatus = newBalance === 0 ? 'Paid' : 'Partial';
      await targetInvoice.save();

      // Update customer balance
      await Customer.findOneAndUpdate(
        { name: targetInvoice.customerName, shopId: req.shopId },
        { $inc: { currentBalance: -payAmt } }
      ).catch(() => {});
    }

    const newPayment = await Payment.create({
      shopId: req.shopId,
      invoiceId: targetInvoice?._id,
      invoiceNumber: invoiceNumber || targetInvoice?.invoiceNumber || `DIR-${Date.now()}`,
      customerName: customerName || targetInvoice?.customerName || 'Customer',
      amount: payAmt,
      paymentDate: new Date(),
      paymentMethod,
      reference: reference || `REF-${Date.now().toString().slice(-6)}`,
      status: 'Completed',
      notes
    });

    res.status(201).json({ payment: newPayment, invoice: targetInvoice });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. Create Razorpay Subscription/Invoice Order
router.post('/create-order', strictProtect, async (req, res) => {
  try {
    const { plan } = req.body;
    const amount = subscriptionPlans[plan];
    if (!amount) return res.status(400).json({ message: 'Choose a valid subscription plan.' });
    const paymentGateway = getRazorpay();
    if (!paymentGateway) return res.status(503).json({ message: 'Secure subscription checkout is not configured yet. Please contact the administrator.' });
    const shop = await Shop.findById(req.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const order = await paymentGateway.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${shop._id}_${Date.now()}`
    });

    shop.razorpayOrderId = order.id;
    shop.pendingPlan = plan;
    shop.pendingPlanAmount = amount;
    await shop.save();

    res.json({ order, key_id: process.env.RAZORPAY_KEY_ID, plan });
  } catch (error) {
    console.error('Payment order creation error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Admins can activate a plan for their own account without a payment gateway.
// This is authorized server-side by the registered account role and ADMIN_EMAIL.
router.post('/admin-activate', strictProtect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!subscriptionPlans[plan]) return res.status(400).json({ message: 'Choose a valid subscription plan.' });
    const shop = await Shop.findById(req.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    const configuredAdminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (shop.role !== 'Admin' || !configuredAdminEmail || shop.email !== configuredAdminEmail) {
      return res.status(403).json({ message: 'Only the configured administrator can activate a plan without payment.' });
    }

    shop.plan = plan;
    shop.subscriptionStatus = 'active';
    shop.subscriptionEndsAt = null;
    shop.trialEndsAt = null;
    shop.pendingPlan = null;
    shop.pendingPlanAmount = null;
    shop.razorpayOrderId = null;
    await shop.save();

    res.json({ message: `${plan} plan activated for the administrator account.`, shop: {
      id: shop._id,
      _id: shop._id,
      firstName: shop.firstName,
      lastName: shop.lastName,
      name: [shop.firstName, shop.lastName].filter(Boolean).join(' '),
      companyName: shop.companyName,
      email: shop.email,
      phone: shop.phone,
      role: shop.role,
      plan: shop.plan,
      subscriptionStatus: shop.subscriptionStatus,
      trialUsed: shop.trialUsed,
      trialStartedAt: shop.trialStartedAt,
      trialEndsAt: shop.trialEndsAt,
      subscriptionEndsAt: shop.subscriptionEndsAt
    } });
  } catch (error) {
    console.error('Admin plan activation error:', error);
    res.status(500).json({ message: 'Could not activate the administrator plan.' });
  }
});

// 4. Verify Payment and activate subscription
router.post('/verify', strictProtect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!getRazorpay() || !process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({ message: 'Payment verification is not configured.' });
    const shop = await Shop.findById(req.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || razorpay_order_id !== shop.razorpayOrderId || !shop.pendingPlan) {
      return res.status(400).json({ message: 'This payment does not match an open subscription order.' });
    }
    if (razorpay_payment_id === shop.razorpayPaymentId) return res.status(409).json({ message: 'This payment has already been applied.' });

    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature);
    const suppliedBuffer = Buffer.from(razorpay_signature);
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return res.status(400).json({ message: 'Payment signature could not be verified.' });
    }

    shop.subscriptionStatus = 'active';
    shop.plan = shop.pendingPlan;
    shop.subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    shop.trialEndsAt = null;
    shop.razorpayPaymentId = razorpay_payment_id;
    shop.pendingPlan = null;
    shop.pendingPlanAmount = null;
    shop.razorpayOrderId = null;
    await shop.save();

    res.json({
      message: 'Payment verified successfully! Subscription activated.',
      shop: {
        id: shop._id,
        subscriptionStatus: shop.subscriptionStatus,
        plan: shop.plan
      }
    });
  } catch {
    res.status(500).json({ message: 'Error verifying payment' });
  }
});

export default router;
