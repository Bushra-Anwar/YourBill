import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  sku: { type: String, default: '' },
  hsnCode: { type: String, default: '' },
  qty: { type: Number, required: true, default: 1 },
  unit: { type: String, default: 'Pcs' },
  rate: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  amount: { type: Number, required: true, default: 0 }
});

const invoiceSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  invoiceNumber: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerGstin: { type: String, default: '' },
  billingAddress: { type: String, default: '' },
  shippingAddress: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['Tax Invoice', 'Sale Invoice', 'Proforma', 'Cash Bill', 'Credit Note', 'POS Bill'], 
    default: 'Tax Invoice' 
  },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, default: 'fixed' },
  discountAmount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Unpaid', 'Overdue', 'Draft', 'Cancelled'],
    default: 'Unpaid' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Credit'], 
    default: 'Cash' 
  },
  notes: { type: String, default: 'Thank you for your business!' },
  terms: { type: String, default: 'Goods once sold cannot be returned. Payment due within 15 days.' }
}, { timestamps: true });

// Backward compatibility virtuals
invoiceSchema.virtual('clientName')
  .get(function() { return this.customerName; })
  .set(function(v) { this.customerName = v; });

invoiceSchema.virtual('amount')
  .get(function() { return this.grandTotal; })
  .set(function(v) { this.grandTotal = v; });

invoiceSchema.virtual('customer')
  .get(function() { return this.customerName; })
  .set(function(v) { this.customerName = v; });

invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
