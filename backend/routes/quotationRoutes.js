import express from 'express';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all quotations
router.get('/', protect, async (req, res) => {
  try {
    const quotations = await Quotation.find({ shopId: req.shopId }).sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new quotation
router.post('/', protect, async (req, res) => {
  try {
    const count = await Quotation.countDocuments({ shopId: req.shopId });
    const quoteNumber = req.body.quoteNumber || `QT-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

    const quotation = new Quotation({
      shopId: req.shopId,
      quoteNumber,
      customer: req.body.customer,
      customerPhone: req.body.customerPhone || '',
      customerEmail: req.body.customerEmail || '',
      salesperson: req.body.salesperson || 'Admin',
      date: req.body.date ? new Date(req.body.date) : new Date(),
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : new Date(Date.now() + 15 * 86400000),
      items: req.body.items || [],
      subtotal: req.body.subtotal || 0,
      totalDiscount: req.body.totalDiscount || 0,
      totalTax: req.body.totalTax || 0,
      amount: req.body.amount || 0,
      status: req.body.status || 'Draft',
      customerNotes: req.body.customerNotes || '',
      internalRemarks: req.body.internalRemarks || ''
    });

    const newQuotation = await quotation.save();
    res.status(201).json(newQuotation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const updated = await Quotation.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      { status: req.body.status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Quotation not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Convert quotation to Invoice
router.post('/:id/convert-to-invoice', protect, async (req, res) => {
  try {
    const quote = await Quotation.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!quote) return res.status(404).json({ message: 'Quotation not found' });

    const invCount = await Invoice.countDocuments({ shopId: req.shopId });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${(invCount + 1).toString().padStart(4, '0')}`;

    const newInvoice = new Invoice({
      shopId: req.shopId,
      invoiceNumber,
      customerName: quote.customer,
      customerPhone: quote.customerPhone,
      date: new Date(),
      dueDate: new Date(Date.now() + 15 * 86400000),
      type: 'Tax Invoice',
      items: quote.items.map(it => ({
        name: it.name,
        qty: it.qty,
        rate: it.rate,
        taxRate: it.taxRate ?? 0,
        amount: it.amount
      })),
      subtotal: quote.subtotal,
      discount: quote.totalDiscount,
      totalTax: quote.totalTax,
      grandTotal: quote.amount,
      paidAmount: 0,
      balanceAmount: quote.amount,
      paymentStatus: 'Unpaid',
      paymentMethod: 'Cash',
      notes: `Converted from Quotation ${quote.quoteNumber}`
    });

    const savedInvoice = await newInvoice.save();

    // Mark quotation as converted
    quote.status = 'Converted';
    quote.convertedInvoiceId = savedInvoice._id;
    await quote.save();

    res.json({ quotation: quote, invoice: savedInvoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete quotation
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Quotation.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
    if (!deleted) return res.status(404).json({ message: 'Quotation not found' });
    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
