// ============================================================
// LOCAL STORAGE BASED DATA LAYER — No backend needed!
// All data persists in the browser (localStorage)
// ============================================================

const generateId = () => {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');

const DB = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  },
  set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
  getObj: (key, def = {}) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
    catch { return def; }
  },
  setObj: (key, data) => localStorage.setItem(key, JSON.stringify(data))
};

// ============================================================
// PRODUCTS API
// ============================================================
export const productApi = {
  getAll: async () => {
    return DB.get('products');
  },
  create: async (data) => {
    const products = DB.get('products');
    const newProduct = {
      ...data,
      _id: generateId(),
      productId: 'PRD-' + generateId().slice(0, 6),
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    DB.set('products', products);
    return newProduct;
  },
  update: async (id, data) => {
    const products = DB.get('products');
    const idx = products.findIndex(p => p._id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...data };
      DB.set('products', products);
      return products[idx];
    }
    throw new Error('Product not found');
  },
  delete: async (id) => {
    const products = DB.get('products').filter(p => p._id !== id);
    DB.set('products', products);
    return { success: true };
  }
};

// ============================================================
// CUSTOMERS API
// ============================================================
export const customerApi = {
  getAll: async () => {
    return DB.get('customers');
  },
  create: async (data) => {
    const customers = DB.get('customers');
    const newCustomer = {
      ...data,
      _id: generateId(),
      customerId: 'CUS-' + generateId().slice(0, 6),
      totalSpent: 0,
      invoicesCount: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    customers.push(newCustomer);
    DB.set('customers', customers);
    return newCustomer;
  },
  update: async (id, data) => {
    const customers = DB.get('customers');
    const idx = customers.findIndex(c => c._id === id);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...data };
      DB.set('customers', customers);
      return customers[idx];
    }
    throw new Error('Customer not found');
  },
  delete: async (id) => {
    const customers = DB.get('customers').filter(c => c._id !== id);
    DB.set('customers', customers);
    return { success: true };
  }
};

// ============================================================
// INVOICES API
// ============================================================
export const invoiceApi = {
  getStats: async () => {
    const invoices = DB.get('invoices');
    const total = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const paid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const outstanding = invoices.reduce((s, i) => s + Math.max(0, (i.totalAmount || i.grandTotal || 0) - (i.paidAmount || 0)), 0);
    const overdue = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + Math.max(0, (i.totalAmount || i.grandTotal || 0) - (i.paidAmount || 0)), 0);
    return {
      totalInvoices: invoices.length,
      totalRevenue: total,
      totalPaid: paid,
      totalOutstanding: outstanding,
      totalOverdue: overdue,
      paidAmount: paid,
      unpaidAmount: outstanding,
      overdueCount: invoices.filter(i => i.status === 'Overdue').length
    };
  },
  getAll: async (params = {}) => {
    let invoices = DB.get('invoices');
    if (params.status) invoices = invoices.filter(i => i.status === params.status);
    if (params.search) {
      const s = params.search.toLowerCase();
      invoices = invoices.filter(i =>
        (i.invoiceNumber || '').toLowerCase().includes(s) ||
        (i.customerName || '').toLowerCase().includes(s)
      );
    }
    return invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getById: async (id) => {
    const invoices = DB.get('invoices');
    const inv = invoices.find(i => i._id === id);
    if (!inv) throw new Error('Invoice not found');
    return inv;
  },
  create: async (data) => {
    const invoices = DB.get('invoices');
    const invNum = 'INV-' + new Date().getFullYear() + '-' + String(invoices.length + 1).padStart(4, '0');
    const totalAmount = Number(data.totalAmount ?? data.grandTotal ?? data.amount ?? data.total ?? 0);
    const totalTax = Number(data.totalTax ?? data.taxAmount ?? 0);
    const items = (data.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity ?? item.qty ?? 1),
      qty: Number(item.qty ?? item.quantity ?? 1),
      rate: Number(item.rate ?? item.price ?? 0),
      amount: Number(item.amount ?? item.total ?? 0)
    }));
    const isPaid = data.status === 'Paid' || data.paymentStatus === 'Paid';
    const newInvoice = {
      ...data,
      customerId: data.customerId || data.clientId || null,
      customerName: data.customerName || data.customer || '',
      items,
      totalTax,
      totalAmount,
      grandTotal: Number(data.grandTotal ?? totalAmount),
      paidAmount: Number(data.paidAmount ?? (isPaid ? totalAmount : 0)),
      _id: generateId(),
      invoiceNumber: invNum,
      status: data.status || data.paymentStatus || 'Unpaid',
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    invoices.push(newInvoice);
    DB.set('invoices', invoices);

    // Update customer stats
    if (data.customerId) {
      const customers = DB.get('customers');
      const cidx = customers.findIndex(c => c._id === data.customerId);
      if (cidx !== -1) {
        customers[cidx].totalSpent = (customers[cidx].totalSpent || 0) + totalAmount;
        customers[cidx].invoicesCount = (customers[cidx].invoicesCount || 0) + 1;
        DB.set('customers', customers);
      }
    }
    // Reduce stock for products
    if (data.items && data.items.length > 0) {
      const products = DB.get('products');
      data.items.forEach(item => {
        if (item.productId) {
          const pidx = products.findIndex(p => p._id === item.productId);
          if (pidx !== -1 && products[pidx].type === 'Physical Product') {
            products[pidx].stock = Math.max(0, (Number(products[pidx].stock) || 0) - item.quantity);
          }
        }
      });
      DB.set('products', products);
    }
    return newInvoice;
  },
  update: async (id, data) => {
    const invoices = DB.get('invoices');
    const idx = invoices.findIndex(i => i._id === id);
    if (idx !== -1) {
      invoices[idx] = { ...invoices[idx], ...data, updatedAt: new Date().toISOString() };
      DB.set('invoices', invoices);
      return invoices[idx];
    }
    throw new Error('Invoice not found');
  },
  recordPayment: async (id, paymentData) => {
    const invoices = DB.get('invoices');
    const idx = invoices.findIndex(i => i._id === id);
    if (idx !== -1) {
      const payment = { ...paymentData, _id: generateId(), date: new Date().toISOString() };
      invoices[idx].payments = [...(invoices[idx].payments || []), payment];
      const totalPaid = invoices[idx].payments.reduce((s, p) => s + (p.amount || 0), 0);
      invoices[idx].paidAmount = totalPaid;
      if (totalPaid >= invoices[idx].totalAmount) invoices[idx].status = 'Paid';
      else if (totalPaid > 0) invoices[idx].status = 'Partial';
      invoices[idx].updatedAt = new Date().toISOString();
      DB.set('invoices', invoices);
      return invoices[idx];
    }
    throw new Error('Invoice not found');
  },
  delete: async (id) => {
    const invoices = DB.get('invoices').filter(i => i._id !== id);
    DB.set('invoices', invoices);
    return { success: true };
  }
};

// ============================================================
// QUOTATIONS API
// ============================================================
export const quotationApi = {
  getAll: async () => {
    return DB.get('quotations').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  create: async (data) => {
    const quotations = DB.get('quotations');
    const newQ = {
      ...data,
      _id: generateId(),
      quotationNumber: 'QUO-' + new Date().getFullYear() + '-' + String(quotations.length + 1).padStart(4, '0'),
      status: 'Draft',
      createdAt: new Date().toISOString()
    };
    quotations.push(newQ);
    DB.set('quotations', quotations);
    return newQ;
  },
  updateStatus: async (id, status) => {
    const quotations = DB.get('quotations');
    const idx = quotations.findIndex(q => q._id === id);
    if (idx !== -1) {
      quotations[idx].status = status;
      DB.set('quotations', quotations);
      return quotations[idx];
    }
    throw new Error('Quotation not found');
  },
  convertToInvoice: async (id) => {
    const quotations = DB.get('quotations');
    const q = quotations.find(q => q._id === id);
    if (!q) throw new Error('Quotation not found');
    const invoice = await invoiceApi.create({
      customerId: q.customerId,
      customerName: q.customerName,
      items: q.items,
      subtotal: q.subtotal,
      taxAmount: q.taxAmount,
      discount: q.discount,
      totalAmount: q.totalAmount,
      notes: q.notes,
      quotationRef: q.quotationNumber
    });
    await quotationApi.updateStatus(id, 'Converted');
    return invoice;
  },
  delete: async (id) => {
    const quotations = DB.get('quotations').filter(q => q._id !== id);
    DB.set('quotations', quotations);
    return { success: true };
  }
};

// ============================================================
// PAYMENTS API
// ============================================================
export const paymentApi = {
  getAll: async () => {
    const invoices = DB.get('invoices');
    const payments = [];
    invoices.forEach(inv => {
      (inv.payments || []).forEach(p => {
        payments.push({ ...p, invoiceNumber: inv.invoiceNumber, customerName: inv.customerName });
      });
    });
    return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  record: async (data) => {
    return invoiceApi.recordPayment(data.invoiceId, data);
  },
  createOrder: async () => { throw new Error('Payment checkout is not configured.'); },
  verify: async () => ({ success: false, message: 'Payment verification is not configured.' })
};

// ============================================================
// ACCOUNTING API
// ============================================================
export const accountingApi = {
  getFinancialOverview: async () => {
    const invoices = DB.get('invoices');
    const expenses = DB.get('expenses');
    const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      grossProfit: totalRevenue,
      invoiceCount: invoices.length,
      expenseCount: expenses.length
    };
  },
  getExpenses: async () => {
    return DB.get('expenses');
  },
  createExpense: async (data) => {
    const expenses = DB.get('expenses');
    const newExp = {
      ...data,
      _id: generateId(),
      expenseId: 'EXP-' + generateId().slice(0, 6),
      createdAt: new Date().toISOString()
    };
    expenses.push(newExp);
    DB.set('expenses', expenses);
    return newExp;
  },
  deleteExpense: async (id) => {
    const expenses = DB.get('expenses').filter(e => e._id !== id);
    DB.set('expenses', expenses);
    return { success: true };
  }
};

// ============================================================
// TAX API
// ============================================================
export const taxApi = {
  getSummary: async () => {
    const invoices = DB.get('invoices');
    const totalTax = invoices.reduce((s, i) => s + (i.taxAmount || 0), 0);
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
    return { totalTax, cgst, sgst, igst: 0, invoiceCount: invoices.length };
  }
};


// ============================================================
// INVENTORY API
// ============================================================
export const inventoryApi = {
  getSuppliers: async () => DB.get('suppliers'),
  getWarehouses: async () => DB.get('warehouses'),
  getMovements: async () => DB.get('movements'),
  getBatches: async () => DB.get('batches'),
  getPurchases: async () => DB.get('purchases'),
  createItem: async (type, data) => {
    const items = DB.get(type);
    const newItem = { ...data, _id: generateId(), createdAt: new Date().toISOString() };
    items.push(newItem);
    DB.set(type, items);
    return newItem;
  },
  deleteItem: async (type, id) => {
    const items = DB.get(type).filter(i => i._id !== id);
    DB.set(type, items);
    return { success: true };
  }
};

// ============================================================
// AI API (mock responses)
// ============================================================
export const aiApi = {
  parseInvoice: async () => { throw new Error('AI invoice parsing is unavailable until the API is configured.'); },
  copilotChat: async () => {
    const invoices = DB.get('invoices');
    const customers = DB.get('customers');
    const products = DB.get('products');
    return {
      reply: `You have ${invoices.length} invoices, ${customers.length} customers, and ${products.length} products in your system.`
    };
  },
  getForecast: async () => {
    return { forecast: [] };
  }
};

const requestBusinessData = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Could not save or load business data.');
  return data;
};

const jsonOptions = (method, body) => ({ method, body: JSON.stringify(body) });
const normalizeInvoice = invoice => ({ ...invoice, status: invoice.status || invoice.paymentStatus, totalAmount: invoice.totalAmount ?? invoice.grandTotal ?? invoice.amount ?? 0 });
const normalizeQuotation = quote => ({ ...quote, quotationNumber: quote.quotationNumber || quote.quoteNumber, customerName: quote.customerName || quote.customer || '', totalAmount: quote.totalAmount ?? quote.amount ?? 0 });

// Persist tenant records in MongoDB so every login sees its own data and admins can review it.
Object.assign(productApi, {
  getAll: () => requestBusinessData('/products'),
  create: data => requestBusinessData('/products', jsonOptions('POST', data)),
  update: (id, data) => requestBusinessData(`/products/${encodeURIComponent(id)}`, jsonOptions('PUT', data)),
  delete: id => requestBusinessData(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
});
Object.assign(customerApi, {
  getAll: () => requestBusinessData('/customers'),
  create: data => requestBusinessData('/customers', jsonOptions('POST', data)),
  update: (id, data) => requestBusinessData(`/customers/${encodeURIComponent(id)}`, jsonOptions('PUT', data)),
  delete: id => requestBusinessData(`/customers/${encodeURIComponent(id)}`, { method: 'DELETE' })
});
Object.assign(invoiceApi, {
  getStats: () => requestBusinessData('/invoices/stats/summary'),
  getAll: async (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value).map(([key, value]) => [key, String(value)]));
    const rows = await requestBusinessData(`/invoices${query.size ? `?${query}` : ''}`);
    return rows.map(normalizeInvoice);
  },
  getById: async id => normalizeInvoice(await requestBusinessData(`/invoices/${encodeURIComponent(id)}`)),
  create: async data => normalizeInvoice(await requestBusinessData('/invoices', jsonOptions('POST', data))),
  update: async (id, data) => normalizeInvoice(await requestBusinessData(`/invoices/${encodeURIComponent(id)}`, jsonOptions('PUT', data))),
  recordPayment: async (id, data) => {
    const result = await requestBusinessData(`/invoices/${encodeURIComponent(id)}/payments`, jsonOptions('POST', data));
    return normalizeInvoice(result.invoice);
  },
  delete: id => requestBusinessData(`/invoices/${encodeURIComponent(id)}`, { method: 'DELETE' })
});
Object.assign(quotationApi, {
  getAll: async () => (await requestBusinessData('/quotations')).map(normalizeQuotation),
  create: async data => normalizeQuotation(await requestBusinessData('/quotations', jsonOptions('POST', {
    ...data,
    customer: data.customer || data.customerName,
    amount: data.amount ?? data.totalAmount,
    totalTax: data.totalTax ?? data.taxAmount
  }))),
  updateStatus: async (id, status) => normalizeQuotation(await requestBusinessData(`/quotations/${encodeURIComponent(id)}/status`, jsonOptions('PATCH', { status }))),
  convertToInvoice: async id => {
    const result = await requestBusinessData(`/quotations/${encodeURIComponent(id)}/convert-to-invoice`, jsonOptions('POST', {}));
    return normalizeInvoice(result.invoice);
  },
  delete: id => requestBusinessData(`/quotations/${encodeURIComponent(id)}`, { method: 'DELETE' })
});
Object.assign(paymentApi, {
  getAll: async () => (await requestBusinessData('/payment')).map(payment => ({ ...payment, date: payment.date || payment.paymentDate })),
  record: data => requestBusinessData('/payment/record', jsonOptions('POST', data))
});
Object.assign(accountingApi, {
  getFinancialOverview: () => requestBusinessData('/accounting/financial-overview'),
  getExpenses: () => requestBusinessData('/accounting/expenses'),
  createExpense: data => requestBusinessData('/accounting/expenses', jsonOptions('POST', data)),
  deleteExpense: id => requestBusinessData(`/accounting/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' })
});
Object.assign(taxApi, { getSummary: () => requestBusinessData('/tax/summary') });
Object.assign(inventoryApi, {
  getSuppliers: () => requestBusinessData('/inventory/suppliers'),
  getWarehouses: () => requestBusinessData('/inventory/warehouses'),
  getMovements: () => requestBusinessData('/inventory/movements'),
  getBatches: () => requestBusinessData('/inventory/batches'),
  getPurchases: () => requestBusinessData('/inventory/purchases'),
  createItem: (type, data) => requestBusinessData(`/inventory/${encodeURIComponent(type)}`, jsonOptions('POST', data)),
  deleteItem: (type, id) => requestBusinessData(`/inventory/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
});
Object.assign(aiApi, {
  parseInvoice: async (prompt, saveToDb = false) => requestBusinessData('/ai/parse-invoice', jsonOptions('POST', { prompt, saveToDb })),
  copilotChat: query => requestBusinessData('/ai/copilot-chat', jsonOptions('POST', { query })),
  getForecast: () => requestBusinessData('/ai/forecast')
});


export default {
  invoice: invoiceApi,
  product: productApi,
  customer: customerApi,
  quotation: quotationApi,
  inventory: inventoryApi,
  accounting: accountingApi,
  tax: taxApi,
  ai: aiApi,
  payment: paymentApi,
};

// ============================================================
// AUTH API  — 100% localStorage, no backend needed
// ============================================================

const USERS_KEY = 'yb_users';
const SESSION_KEY = 'yb_session';

const simpleHash = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const makeToken = (userId) =>
  btoa(`${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`);

const getUsers = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
};
const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

// Seed built-in admin if not yet created
const seedAdmin = () => {
  const users = getUsers();
  if (!users.find(u => u.email === 'admin@yourbill.in')) {
    users.unshift({
      _id: 'ADMIN001',
      email: 'admin@yourbill.in',
      passwordHash: simpleHash('admin@123'),
      name: 'Platform Admin',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'admin',
      companyName: 'YourBill HQ',
      subscriptionStatus: 'active',
      plan: 'enterprise',
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
  }
};
seedAdmin();

export const authApi = {
  register: async ({ firstName, lastName, email, password, companyName, phone, gstin, address, city, state, pincode }) => {
    await new Promise(r => setTimeout(r, 400)); // simulate network
    const users = getUsers();
    const emailLower = (email || '').trim().toLowerCase();
    if (!emailLower || !password) throw new Error('Email and password are required.');
    if (users.find(u => u.email === emailLower)) throw new Error('An account with this email already exists. Please login.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const newUser = {
      _id: 'USR-' + generateId(),
      email: emailLower,
      passwordHash: simpleHash(password),
      name: [firstName, lastName].filter(Boolean).join(' ') || emailLower.split('@')[0],
      firstName: firstName || '',
      lastName: lastName || '',
      companyName: companyName || '',
      phone: phone || '',
      gstin: gstin || '',
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      role: 'user',
      subscriptionStatus: 'trial',
      plan: 'free',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);

    const { passwordHash: _h, ...safeUser } = newUser;
    const token = makeToken(newUser._id);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: newUser._id, token }));
    return { user: safeUser, token };
  },

  login: async ({ email, password }) => {
    await new Promise(r => setTimeout(r, 400)); // simulate network
    if (!email || !password) throw new Error('Please enter your email and password.');
    const emailLower = email.trim().toLowerCase();
    const users = getUsers();
    seedAdmin(); // ensure admin always exists

    const found = users.find(u => u.email === emailLower);
    if (!found) throw new Error('No account found with this email. Please register first.');
    if (found.passwordHash !== simpleHash(password)) throw new Error('Incorrect password. Please try again.');

    const { passwordHash: _h, ...safeUser } = found;
    const token = makeToken(found._id);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: found._id, token }));
    return { user: safeUser, token };
  },

  getMe: async () => {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!session) throw new Error('Not authenticated');
    const users = getUsers();
    seedAdmin();
    const found = users.find(u => u._id === session.userId);
    if (!found) throw new Error('User not found');
    const { passwordHash: _h, ...safeUser } = found;
    return safeUser;
  },

  updateProfile: async (data) => {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!session) throw new Error('Not authenticated');
    const users = getUsers();
    const idx = users.findIndex(u => u._id === session.userId);
    if (idx === -1) throw new Error('User not found');
    if (data.password) {
      users[idx].passwordHash = simpleHash(data.password);
      delete data.password;
    }
    users[idx] = { ...users[idx], ...data, _id: users[idx]._id, email: users[idx].email };
    saveUsers(users);
    const { passwordHash: _h, ...safeUser } = users[idx];
    return safeUser;
  },

  logout: async () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    return { success: true };
  }
};

// ============================================================
// ADMIN API  — localStorage stub
// ============================================================
export const adminApi = {
  getShops: async () => {
    // Return registered users as "shops" for admin view
    const users = getUsers();
    return users.filter(u => u.role !== 'admin').map(u => ({
      ...u,
      shopName: u.companyName || u.name,
      renewalDueSoon: u.subscriptionStatus === 'trial' && u.trialEndsAt
        ? (new Date(u.trialEndsAt) - Date.now()) < 7 * 24 * 60 * 60 * 1000
        : false,
      daysUntilExpiry: u.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(u.trialEndsAt) - Date.now()) / (24 * 60 * 60 * 1000)))
        : null
    }));
  },
  updateShop: async (id, data) => {
    const users = getUsers();
    const idx = users.findIndex(u => u._id === id);
    if (idx !== -1) { users[idx] = { ...users[idx], ...data }; saveUsers(users); }
    return users[idx];
  }
};

