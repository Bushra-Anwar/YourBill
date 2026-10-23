import Shop from './models/Shop.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Invoice from './models/Invoice.js';
import Quotation from './models/Quotation.js';
import Payment from './models/Payment.js';
import Expense from './models/Expense.js';

// Keep existing records accessible without creating example business data.
export async function migrateLegacyDocuments() {
  const shops = await Shop.find({}).select('_id email').limit(2);
  if (shops.length !== 1 || shops[0].email === 'admin@yourbill.com') return;
  const shopId = shops[0]._id;
  await Promise.all([
    Product.updateMany({ $or: [{ shopId: { $exists: false } }, { shopId: null }] }, { shopId }),
    Customer.updateMany({ $or: [{ shopId: { $exists: false } }, { shopId: null }] }, { shopId }),
    Invoice.updateMany({ $or: [{ shopId: { $exists: false } }, { shopId: null }] }, { shopId }),
    Quotation.updateMany({ $or: [{ shopId: { $exists: false } }, { shopId: null }] }, { shopId }),
    Expense.updateMany({ $or: [{ shopId: { $exists: false } }, { shopId: null }] }, { shopId }),
    Payment.updateMany({ $or: [{ shopId: { $exists: false } }, { shopId: null }] }, { shopId })
  ]);
}
