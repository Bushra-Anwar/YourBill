import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, default: '' },
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Client'], default: 'Client' },
  phone: { type: String, default: '' },
  gstin: { type: String, default: '' },
  pan: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  branches: [{
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    createdAt: { type: Date, default: Date.now }
  }],
  currency: { type: String, default: '₹' },
  logo: { type: String, default: '🏢' },
  invoicePrefix: { type: String, default: 'INV-' },
  subscriptionStatus: { 
    type: String, 
    enum: ['pending', 'trial', 'active', 'expired'],
    default: 'pending'
  },
  plan: { type: String, default: 'Starter' },
  trialUsed: { type: Boolean, default: false },
  trialStartedAt: { type: Date, default: null },
  trialEndsAt: { type: Date, default: null },
  subscriptionEndsAt: { type: Date, default: null },
  razorpayOrderId: { type: String, default: null },
  pendingPlan: { type: String, default: null },
  pendingPlanAmount: { type: Number, default: null },
  razorpayPaymentId: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('Shop', shopSchema);
