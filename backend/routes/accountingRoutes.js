import express from 'express';
import Expense from '../models/Expense.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Get Financial Overview for Accounting Dashboard
router.get('/financial-overview', protect, async (req, res) => {
  try {
    const invoices = await Invoice.find({ shopId: req.shopId });
    const expenses = await Expense.find({ shopId: req.shopId });
    const products = await Product.find({ shopId: req.shopId });
    const payments = await Payment.find({ shopId: req.shopId });

    // Inventory Valuation
    const inventoryValuation = products.reduce((sum, product) => sum + (Number(product.stock) || 0) * (Number(product.costPrice) || 0), 0);

    // Receivables (Unpaid & Overdue balance)
    const accountsReceivable = invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    // Total Revenue collected & billed
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalCashBankReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Total Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const productCosts = new Map(products.map(product => [String(product._id), Number(product.costPrice) || 0]));
    const actualCOGS = invoices.reduce((invoiceSum, invoice) => invoiceSum + (invoice.items || []).reduce((itemSum, item) => {
      const cost = productCosts.get(String(item.productId || ''));
      return itemSum + (cost === undefined ? 0 : cost * (Number(item.qty ?? item.quantity) || 0));
    }, 0), 0);

    // Net Profit
    const grossProfit = totalBilled - actualCOGS;
    const netProfit = grossProfit - totalExpenses;

    // Cash and Bank balance
    const cashReceived = payments.filter(p => p.paymentMethod === 'Cash').reduce((s, p) => s + p.amount, 0);
    const bankReceived = totalCashBankReceived - cashReceived;
    const paidExpenses = expenses.filter(expense => String(expense.status || 'Paid').toLowerCase() === 'paid');
    const cashExpense = paidExpenses.filter(expense => String(expense.paymentMethod).toLowerCase() === 'cash').reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const bankExpense = paidExpenses.filter(expense => String(expense.paymentMethod).toLowerCase() !== 'cash').reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const cashBalance = cashReceived - cashExpense;
    const bankBalance = bankReceived - bankExpense;

    // Total Assets = Cash + Bank + Accounts Receivable + Inventory
    const totalAssets = cashBalance + bankBalance + accountsReceivable + inventoryValuation;

    // Liabilities = GST Output tax payable + Pending bills
    const outputTax = invoices.reduce((sum, inv) => sum + (inv.totalTax || 0), 0);
    const inputTaxCredit = expenses.reduce((sum, e) => sum + (e.taxAmount || 0), 0);
    const netGstPayable = Math.max(0, outputTax - inputTaxCredit);
    const unpaidExpensePayables = expenses.filter(expense => String(expense.status || '').toLowerCase() !== 'paid').reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const totalLiabilities = netGstPayable + unpaidExpensePayables;

    // Equity = Assets - Liabilities
    const totalEquity = totalAssets - totalLiabilities;

    // Synthesized journal entries
    const journalEntries = [
      ...invoices.slice(0, 4).map(inv => ({
        id: `JE-INV-${inv._id.toString().substring(18)}`,
        date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
        description: `Sales Invoice #${inv.invoiceNumber} to ${inv.customerName}`,
        debitAccount: inv.paymentStatus === 'Paid' ? 'Cash / Bank A/c' : 'Accounts Receivable A/c',
        creditAccount: 'Sales Revenue A/c',
        amount: inv.grandTotal || 0,
        status: 'Posted'
      })),
      ...expenses.slice(0, 3).map(exp => ({
        id: `JE-EXP-${exp._id.toString().substring(18)}`,
        date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : '',
        description: `${exp.category} Expense paid to ${exp.vendor}`,
        debitAccount: `${exp.category} Expense A/c`,
        creditAccount: 'Bank A/c',
        amount: exp.amount || 0,
        status: 'Posted'
      }))
    ];

    res.json({
      totalAssets,
      totalLiabilities,
      totalEquity,
      netProfit,
      grossProfit,
      cashBalance,
      bankBalance,
      inventoryValuation,
      accountsReceivable,
      totalExpenses,
      journalEntries
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Get Expenses
router.get('/expenses', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({ shopId: req.shopId }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Create Expense
router.post('/expenses', protect, async (req, res) => {
  try {
    const count = await Expense.countDocuments({ shopId: req.shopId });
    const expenseNumber = req.body.expenseNumber || `EXP-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

    const newExpense = new Expense({
      shopId: req.shopId,
      expenseNumber,
      category: req.body.category || 'Miscellaneous',
      vendor: req.body.vendor,
      amount: parseFloat(req.body.amount) || 0,
      taxAmount: parseFloat(req.body.taxAmount) || 0,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      paymentMethod: req.body.paymentMethod || 'Bank Transfer',
      status: req.body.status || 'Paid',
      notes: req.body.notes || ''
    });

    const saved = await newExpense.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. Delete Expense
router.delete('/expenses/:id', protect, async (req, res) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
