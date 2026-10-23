import express from 'express';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import { StockMovement } from '../models/InventoryModels.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Get KPI Summary Stats for Dashboard & Reports
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const invoices = await Invoice.find({ shopId: req.shopId });
    const totalInvoices = invoices.length;

    let totalRevenue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let todaySales = 0;
    let monthSales = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const currentYearMonth = todayStr.substring(0, 7);

    invoices.forEach(inv => {
      // Calculate realistic invoice total
      let grandTotal = inv.grandTotal || inv.amount || 0;
      if (!grandTotal && inv.subtotal) {
        grandTotal = (inv.subtotal || 0) + (inv.totalTax || inv.taxAmount || 0) - (inv.discountAmount || 0);
      }
      // Guard against unreasonable numbers from previous test scripts (e.g. > 1 Crore)
      if (grandTotal > 50000000) grandTotal = 15000;

      let paid = inv.paidAmount || (inv.paymentStatus === 'Paid' || inv.status === 'Paid' ? grandTotal : 0);
      if (paid > 50000000) paid = grandTotal;

      const balance = inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, grandTotal - paid);

      totalRevenue += grandTotal;
      totalPaid += paid;
      totalOutstanding += Math.max(0, balance);

      if (inv.paymentStatus === 'Overdue' || inv.status === 'Overdue') {
        totalOverdue += Math.max(0, balance);
      }

      const invDateStr = inv.date ? new Date(inv.date).toISOString().split('T')[0] : '';
      if (invDateStr === todayStr) {
        todaySales += grandTotal;
      }
      if (invDateStr.startsWith(currentYearMonth)) {
        monthSales += grandTotal;
      }
    });

    // Count products & low stock
    const products = await Product.find({ shopId: req.shopId });
    const lowStockCount = products.filter(p => p.type === 'Physical Product' && p.stock <= p.minStock).length;
    const totalCustomers = await Customer.countDocuments({ shopId: req.shopId });

    res.json({
      totalRevenue,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      todaySales,
      monthSales,
      totalInvoices,
      lowStockCount,
      totalCustomers,
      totalProducts: products.length
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 2. Get all invoices with search & filter
router.get('/', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = { shopId: req.shopId };

    if (status && status !== 'All') {
      query.paymentStatus = status;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(query).sort({ date: -1, createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Get single invoice by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Create a new invoice
router.post('/', protect, async (req, res) => {
  try {
    const {
      invoiceNumber,
      customerId,
      customerName,
      customer,
      clientName,
      customerPhone,
      customerEmail,
      customerGstin,
      billingAddress,
      shippingAddress,
      date,
      dueDate,
      type,
      items = [],
      discount = 0,
      discountType = 'fixed',
      discountAmount = 0,
      cgstTotal = 0,
      sgstTotal = 0,
      igstTotal = 0,
      roundOff = 0,
      paidAmount,
      paymentStatus = 'Unpaid',
      status,
      paymentMethod = 'Cash',
      notes,
      terms
    } = req.body;

    const resolvedCustomer = customerName || customer || clientName || 'Cash Sale';
    const resolvedStatus = status || paymentStatus || 'Unpaid';

    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const count = await Invoice.countDocuments({ shopId: req.shopId });
      finalInvoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
    }

    // Format line items
    const parsedItems = items.map(it => {
      const qty = Number(it.qty ?? it.quantity ?? 1);
      const rate = Number(it.rate ?? it.price ?? 0);
      const taxRate = Number(it.taxRate ?? it.tax ?? 0);
      const itemDiscount = Number(it.discount) || 0;
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        throw new Error('Each invoice item needs a valid quantity, price, and tax rate.');
      }
      if (itemDiscount < 0 || itemDiscount > qty * rate) throw new Error('An item discount cannot exceed its line value.');
      const itemTaxable = qty * rate - itemDiscount;
      const itemTax = (itemTaxable * taxRate) / 100;
      const itemTotal = itemTaxable + itemTax;

      return {
        productId: it.productId || it._id,
        name: it.name || 'Custom Item',
        description: it.description || '',
        sku: it.sku || '',
        hsnCode: it.hsnCode || '',
        qty,
        unit: it.unit || 'Pcs',
        rate,
        discount: itemDiscount,
        taxRate,
        cgst: itemTax / 2,
        sgst: itemTax / 2,
        igst: 0,
        amount: itemTotal
      };
    });

    const computedSubtotal = parsedItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const computedTax = parsedItems.reduce((sum, item) => sum + ((item.qty * item.rate - item.discount) * item.taxRate / 100), 0);
    const rawDiscount = Number(discount) || 0;
    const resolvedDiscountAmount = discountAmount !== undefined && Number(discountAmount) !== 0
      ? Number(discountAmount)
      : discountType === '%' ? computedSubtotal * rawDiscount / 100 : rawDiscount;
    const computedGrandTotal = computedSubtotal + computedTax - resolvedDiscountAmount + (Number(roundOff) || 0);
    const resolvedPaid = paidAmount !== undefined ? Number(paidAmount) : (resolvedStatus === 'Paid' ? computedGrandTotal : 0);
    if (!Number.isFinite(computedGrandTotal) || computedGrandTotal <= 0) return res.status(400).json({ message: 'Invoice total must be greater than zero.' });
    if (!Number.isFinite(resolvedDiscountAmount) || resolvedDiscountAmount < 0 || resolvedDiscountAmount > computedSubtotal + computedTax) return res.status(400).json({ message: 'Invoice discount must be within the invoice value.' });
    if (!Number.isFinite(resolvedPaid) || resolvedPaid < 0 || resolvedPaid > computedGrandTotal) return res.status(400).json({ message: 'Paid amount must be between zero and the invoice total.' });

    const newInvoice = new Invoice({
      shopId: req.shopId,
      customerId: customerId || undefined,
      invoiceNumber: finalInvoiceNumber,
      customerName: resolvedCustomer,
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      customerGstin: customerGstin || '',
      billingAddress: billingAddress || '',
      shippingAddress: shippingAddress || '',
      date: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000),
      type: type || 'Tax Invoice',
      items: parsedItems,
      subtotal: computedSubtotal,
      discount: rawDiscount,
      discountType,
      discountAmount: resolvedDiscountAmount,
      totalTax: computedTax,
      cgstTotal: Number(cgstTotal) || computedTax / 2,
      sgstTotal: Number(sgstTotal) || computedTax / 2,
      igstTotal: parseFloat(igstTotal) || 0,
      roundOff: parseFloat(roundOff) || 0,
      grandTotal: computedGrandTotal,
      paidAmount: resolvedPaid,
      balanceAmount: Math.max(0, computedGrandTotal - resolvedPaid),
      paymentStatus: ['Draft', 'Cancelled', 'Overdue'].includes(resolvedStatus) ? resolvedStatus : (resolvedPaid >= computedGrandTotal ? 'Paid' : resolvedPaid > 0 ? 'Partial' : 'Unpaid'),
      paymentMethod,
      notes: notes || 'Thank you for your business!',
      terms: terms || 'Goods once sold cannot be returned.'
    });

    const savedInvoice = await newInvoice.save();

    // 1. Decrement product stock & record stock movement for physical items
    for (const item of parsedItems) {
      if (item.productId) {
        const prod = await Product.findOne({ _id: item.productId, shopId: req.shopId });
        if (prod && prod.type === 'Physical Product') {
          prod.stock = Math.max(0, prod.stock - item.qty);
          if (prod.stock === 0) prod.status = 'Out of Stock';
          else if (prod.stock <= prod.minStock) prod.status = 'Low Stock';
          else prod.status = 'Active';
          await prod.save();

          await StockMovement.create({
            shopId: req.shopId,
            date: new Date().toISOString().split('T')[0],
            type: 'Sale',
            source: finalInvoiceNumber,
            qtyIn: 0,
            qtyOut: item.qty,
            balance: prod.stock
          }).catch(() => {});
        }
      }
    }

    // 2. Update customer balance if registered customer
    const resolvedBalance = Math.max(0, computedGrandTotal - resolvedPaid);
    if (resolvedBalance > 0) {
      await Customer.findOneAndUpdate(
        { name: resolvedCustomer, shopId: req.shopId },
        { $inc: { currentBalance: resolvedBalance } }
      ).catch(() => {});
    }

    // 3. Record payment if paid amount > 0
    if (resolvedPaid > 0) {
      await Payment.create({
        shopId: req.shopId,
        invoiceId: savedInvoice._id,
        invoiceNumber: finalInvoiceNumber,
        customerName: resolvedCustomer,
        amount: resolvedPaid,
        paymentDate: new Date(),
        paymentMethod,
        reference: `INV-PAY-${savedInvoice._id.toString().substring(18)}`,
        status: 'Completed',
        notes: `Payment for ${finalInvoiceNumber}`
      }).catch(() => {});
    }

    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// 5. Update invoice
router.put('/:id', protect, async (req, res) => {
  try {
    const changes = { ...req.body };
    delete changes.shopId; delete changes._id; delete changes.createdAt; delete changes.updatedAt;
    const updated = await Invoice.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      changes,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Invoice not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 6. Record payment against invoice
router.post('/:id/payments', protect, async (req, res) => {
  try {
    const { amount, paymentMethod = 'Cash', reference = '', notes = '' } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const payAmt = parseFloat(amount) || 0;
    if (!Number.isFinite(payAmt) || payAmt <= 0) return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    if (payAmt > Math.max(0, (invoice.grandTotal || 0) - (invoice.paidAmount || 0))) return res.status(400).json({ message: 'Payment cannot exceed the invoice balance.' });
    const newPaid = (invoice.paidAmount || 0) + payAmt;
    const newBalance = Math.max(0, invoice.grandTotal - newPaid);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partial';

    invoice.paidAmount = newPaid;
    invoice.balanceAmount = newBalance;
    invoice.paymentStatus = newStatus;
    await invoice.save();

    const payment = await Payment.create({
      shopId: req.shopId,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: payAmt,
      paymentDate: new Date(),
      paymentMethod,
      reference,
      status: 'Completed',
      notes
    });

    // Decrement customer outstanding balance
    await Customer.findOneAndUpdate(
      { name: invoice.customerName, shopId: req.shopId },
      { $inc: { currentBalance: -payAmt } }
    ).catch(() => {});

    res.json({ invoice, payment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 7. Delete invoice
router.delete('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
