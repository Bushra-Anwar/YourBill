import express from 'express';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/summary', protect, async (req, res) => {
  try {
    const invoices = await Invoice.find({ shopId: req.shopId });
    const expenses = await Expense.find({ shopId: req.shopId });

    let outputCgst = 0;
    let outputSgst = 0;
    let outputIgst = 0;
    let totalTaxableValue = 0;

    let b2bCount = 0;
    let b2bTotal = 0;
    let b2bTax = 0;

    let b2cCount = 0;
    let b2cTotal = 0;
    let b2cTax = 0;

    const hsnMap = {};
    const ratesMap = new Map();

    invoices.forEach(inv => {
      totalTaxableValue += (inv.subtotal || 0);
      outputCgst += (inv.cgstTotal ?? ((inv.igstTotal || 0) ? 0 : (inv.totalTax || 0) / 2));
      outputSgst += (inv.sgstTotal ?? ((inv.igstTotal || 0) ? 0 : (inv.totalTax || 0) / 2));
      outputIgst += (inv.igstTotal || 0);

      const hasGst = inv.customerGstin && inv.customerGstin.trim().length > 5;
      if (hasGst) {
        b2bCount++;
        b2bTotal += (inv.grandTotal || 0);
        b2bTax += (inv.totalTax || 0);
      } else {
        b2cCount++;
        b2cTotal += (inv.grandTotal || 0);
        b2cTax += (inv.totalTax || 0);
      }

      // HSN aggregation
      (inv.items || []).forEach(item => {
        const hsn = item.hsnCode || 'Not provided';
        const rate = Number(item.taxRate ?? 0);
        ratesMap.set(rate, (ratesMap.get(rate) || 0) + 1);
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            code: hsn,
            description: item.name,
            totalQty: 0,
            taxableValue: 0,
            taxRate: rate,
            totalTax: 0
          };
        }
        hsnMap[hsn].totalQty += (item.qty || 1);
        const taxable = (item.qty || 1) * (item.rate || 0);
        hsnMap[hsn].taxableValue += taxable;
        hsnMap[hsn].totalTax += (taxable * rate) / 100;
      });
    });

    const totalOutputTax = outputCgst + outputSgst + outputIgst;
    const inputTaxCredit = expenses.reduce((s, e) => s + (e.taxAmount || 0), 0);
    const netTaxPayable = Math.max(0, totalOutputTax - inputTaxCredit);

    const hsnSummary = Object.values(hsnMap);

    res.json({
      totalTaxableValue,
      totalOutputTax,
      outputCgst,
      outputSgst,
      outputIgst,
      inputTaxCredit,
      netTaxPayable,
      b2b: { count: b2bCount, total: b2bTotal, tax: b2bTax },
      b2c: { count: b2cCount, total: b2cTotal, tax: b2cTax },
      hsnSummary,
      taxRates: [...ratesMap.entries()].sort(([a], [b]) => a - b).map(([rate, count]) => ({ id: `TX-${rate}`, name: `${rate}% tax rate`, type: rate === 0 ? 'Exempt' : 'Recorded', rate, breakdown: `${count} invoice line${count === 1 ? '' : 's'} currently use this rate`, status: 'Observed' }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
