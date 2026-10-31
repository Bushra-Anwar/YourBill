// ============================================================
// FIRESTORE CLOUD DATA LAYER — Complete API
// ============================================================
import { db, auth } from './firebaseConfig';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from 'firebase/auth';

const generateId = () =>
  Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();

const uid = () => auth.currentUser?.uid || null;

const userCol = (sub) => {
  const u = uid();
  if (!u) throw new Error('Not authenticated — please log in first.');
  return collection(db, 'users', u, sub);
};

const userDocRef = (sub, id) => {
  const u = uid();
  if (!u) throw new Error('Not authenticated');
  return doc(db, 'users', u, sub, id);
};

const snap2arr = (snap) => snap.docs.map(d => ({ _id: d.id, ...d.data() }));

const sanitizeFirestoreData = (data) => {
  if (data === undefined) return null;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    return value === undefined ? null : value;
  }));
};

// ============================================================
// INVOICES API
// ============================================================
export const invoiceApi = {
  getStats: async () => {
    try {
      const snap = await getDocs(userCol('invoices'));
      const invoices = snap2arr(snap);
      const total = invoices.reduce((s, i) => s + (Number(i.grandTotal || i.totalAmount || 0)), 0);
      const paid = invoices.filter(i => (i.status === 'Paid' || i.paymentStatus === 'Paid')).reduce((s, i) => s + (Number(i.grandTotal || i.totalAmount || 0)), 0);
      const outstanding = invoices.reduce((s, i) => s + Math.max(0, (Number(i.grandTotal || i.totalAmount || 0)) - (Number(i.paidAmount || 0))), 0);
      const overdue = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + (Number(i.grandTotal || i.totalAmount || 0)), 0);

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
    } catch {
      return { totalInvoices: 0, totalRevenue: 0, totalPaid: 0, totalOutstanding: 0, totalOverdue: 0 };
    }
  },

  getAll: async (params = {}) => {
    try {
      const snap = await getDocs(userCol('invoices'));
      let invoices = snap2arr(snap);
      if (params.status && params.status !== 'All') {
        invoices = invoices.filter(i => (i.status === params.status || i.paymentStatus === params.status));
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        invoices = invoices.filter(i =>
          (i.invoiceNumber || '').toLowerCase().includes(s) ||
          (i.customerName || '').toLowerCase().includes(s)
        );
      }
      return invoices.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } catch (err) {
      console.error('Failed to get invoices:', err);
      return [];
    }
  },

  getById: async (id) => {
    const snap = await getDoc(userDocRef('invoices', id));
    if (!snap.exists()) throw new Error('Invoice not found');
    return { _id: snap.id, ...snap.data() };
  },

  create: async (data) => {
    const existing = snap2arr(await getDocs(userCol('invoices')));
    const invNum = data.invoiceNumber || ('INV-' + new Date().getFullYear() + '-' + String(existing.length + 1).padStart(4, '0'));
    const grandTotal = Number(data.grandTotal ?? data.totalAmount ?? 0);
    const isPaid = data.status === 'Paid' || data.paymentStatus === 'Paid';
    const id = generateId();

    const safeItems = (data.items || []).map(item => ({
      productId: item.productId || '',
      name: item.name || '',
      description: item.description || '',
      hsnCode: item.hsnCode || '',
      qty: Number(item.qty ?? 1),
      rate: Number(item.rate ?? 0),
      taxRate: Number(item.taxRate ?? item.tax ?? 0),
      amount: Number(item.amount ?? ((item.qty || 1) * (item.rate || 0)))
    }));

    const rawInvoice = {
      ...data,
      _id: id,
      invoiceNumber: invNum,
      customerName: data.customerName || data.customer || 'Cash Sale',
      customerPhone: data.customerPhone || '',
      customerGstin: data.customerGstin || '',
      customerId: data.customerId || '',
      date: data.date || new Date().toISOString().slice(0, 10),
      dueDate: data.dueDate || data.date || new Date().toISOString().slice(0, 10),
      type: data.type || 'Tax Invoice',
      items: safeItems,
      subtotal: Number(data.subtotal || grandTotal),
      totalTax: Number(data.totalTax || 0),
      grandTotal: grandTotal,
      totalAmount: grandTotal,
      paidAmount: Number(data.paidAmount ?? (isPaid ? grandTotal : 0)),
      balanceAmount: Number(data.balanceAmount ?? (isPaid ? 0 : grandTotal)),
      status: isPaid ? 'Paid' : 'Unpaid',
      paymentStatus: isPaid ? 'Paid' : 'Unpaid',
      paymentMethod: data.paymentMethod || 'Cash',
      notes: data.notes || '',
      terms: data.terms || '',
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const cleanInvoice = sanitizeFirestoreData(rawInvoice);
    await setDoc(userDocRef('invoices', id), cleanInvoice);

    // Background stock & customer update without breaking invoice save
    if (data.customerId) {
      try {
        const cRef = userDocRef('customers', data.customerId);
        const cSnap = await getDoc(cRef);
        if (cSnap.exists()) {
          const c = cSnap.data();
          await updateDoc(cRef, {
            totalSpent: (Number(c.totalSpent) || 0) + grandTotal,
            invoicesCount: (Number(c.invoicesCount) || 0) + 1
          });
        }
      } catch { /* customer update non-blocking */ }
    }

    if (safeItems.length) {
      for (const item of safeItems) {
        if (item.productId) {
          try {
            const pRef = userDocRef('products', item.productId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              const curStock = Number(pSnap.data().stock) || 0;
              await updateDoc(pRef, { stock: Math.max(0, curStock - item.qty) });
            }
          } catch { /* product update non-blocking */ }
        }
      }
    }

    return cleanInvoice;
  },

  update: async (id, data) => {
    const cleanData = sanitizeFirestoreData({ ...data, updatedAt: new Date().toISOString() });
    await updateDoc(userDocRef('invoices', id), cleanData);
    const snap = await getDoc(userDocRef('invoices', id));
    return { _id: snap.id, ...snap.data() };
  },

  recordPayment: async (id, paymentData) => {
    const snap = await getDoc(userDocRef('invoices', id));
    if (!snap.exists()) throw new Error('Invoice not found');
    const inv = snap.data();
    const payment = sanitizeFirestoreData({ ...paymentData, _id: generateId(), date: new Date().toISOString() });
    const payments = [...(inv.payments || []), payment];
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const status = totalPaid >= (inv.grandTotal || inv.totalAmount) ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Unpaid');
    await updateDoc(userDocRef('invoices', id), { payments, paidAmount: totalPaid, status, updatedAt: new Date().toISOString() });
    return { _id: id, ...inv, payments, paidAmount: totalPaid, status };
  },

  delete: async (id) => {
    await deleteDoc(userDocRef('invoices', id));
    return { success: true };
  }
};

// ============================================================
// PRODUCTS API
// ============================================================
export const productApi = {
  getAll: async () => {
    try {
      const snap = await getDocs(userCol('products'));
      const list = snap2arr(snap);
      if (list && list.length > 0) {
        try { localStorage.setItem('user_products_cache', JSON.stringify(list)); } catch {}
        return list;
      }
    } catch (e) {
      // Fallback to locally cached products if offline
    }
    try {
      const cached = localStorage.getItem('user_products_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  },
  create: async (data) => {
    const id = generateId();
    const record = sanitizeFirestoreData({
      ...data,
      _id: id,
      productId: 'PRD-' + id.slice(0, 6),
      status: 'Active',
      createdAt: new Date().toISOString()
    });
    try {
      await setDoc(userDocRef('products', id), record);
    } catch (e) {
      console.warn('Saving product locally:', e);
    }
    try {
      const current = JSON.parse(localStorage.getItem('user_products_cache') || '[]');
      localStorage.setItem('user_products_cache', JSON.stringify([...current, record]));
    } catch {}
    return record;
  },
  update: async (id, data) => {
    const cleanData = sanitizeFirestoreData(data);
    try {
      await updateDoc(userDocRef('products', id), cleanData);
    } catch (e) {}
    try {
      const current = JSON.parse(localStorage.getItem('user_products_cache') || '[]');
      const updated = current.map(p => p._id === id ? { ...p, ...cleanData } : p);
      localStorage.setItem('user_products_cache', JSON.stringify(updated));
    } catch {}
    return { _id: id, ...cleanData };
  },
  delete: async (id) => {
    try {
      await deleteDoc(userDocRef('products', id));
    } catch (e) {}
    try {
      const current = JSON.parse(localStorage.getItem('user_products_cache') || '[]');
      const filtered = current.filter(p => p._id !== id);
      localStorage.setItem('user_products_cache', JSON.stringify(filtered));
    } catch {}
    return { success: true };
  }
};

// ============================================================
// CUSTOMERS API
// ============================================================
export const customerApi = {
  getAll: async () => snap2arr(await getDocs(userCol('customers'))),
  create: async (data) => {
    const id = generateId();
    const record = sanitizeFirestoreData({
      ...data,
      _id: id,
      customerId: 'CUS-' + id.slice(0, 6),
      totalSpent: 0,
      invoicesCount: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    });
    await setDoc(userDocRef('customers', id), record);
    return record;
  },
  update: async (id, data) => {
    const cleanData = sanitizeFirestoreData(data);
    await updateDoc(userDocRef('customers', id), cleanData);
    return { _id: id, ...cleanData };
  },
  delete: async (id) => {
    await deleteDoc(userDocRef('customers', id));
    return { success: true };
  }
};

// ============================================================
// QUOTATIONS API
// ============================================================
export const quotationApi = {
  getAll: async () => {
    const arr = snap2arr(await getDocs(userCol('quotations')));
    return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  create: async (data) => {
    const existing = snap2arr(await getDocs(userCol('quotations')));
    const id = generateId();
    const newQ = sanitizeFirestoreData({
      ...data,
      _id: id,
      quotationNumber: 'QUO-' + new Date().getFullYear() + '-' + String(existing.length + 1).padStart(4, '0'),
      status: 'Draft',
      createdAt: new Date().toISOString()
    });
    await setDoc(userDocRef('quotations', id), newQ);
    return newQ;
  },
  updateStatus: async (id, status) => {
    await updateDoc(userDocRef('quotations', id), { status });
    const snap = await getDoc(userDocRef('quotations', id));
    return { _id: snap.id, ...snap.data() };
  },
  delete: async (id) => {
    await deleteDoc(userDocRef('quotations', id));
    return { success: true };
  }
};

// ============================================================
// PAYMENTS API
// ============================================================
export const paymentApi = {
  getAll: async () => {
    const invoices = snap2arr(await getDocs(userCol('invoices')));
    const payments = [];
    invoices.forEach(inv => {
      (inv.payments || []).forEach(p => {
        payments.push({ ...p, invoiceNumber: inv.invoiceNumber, customerName: inv.customerName });
      });
    });
    return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  record: async (data) => invoiceApi.recordPayment(data.invoiceId, data),
  createOrder: async () => { throw new Error('Payment checkout is not configured.'); },
  verify: async () => ({ success: false, message: 'Payment verification is not configured.' })
};

// ============================================================
// ACCOUNTING API
// ============================================================
export const accountingApi = {
  getFinancialOverview: async () => {
    const invoices = snap2arr(await getDocs(userCol('invoices')));
    const expenses = snap2arr(await getDocs(userCol('expenses')));
    const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    return { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, grossProfit: totalRevenue, invoiceCount: invoices.length, expenseCount: expenses.length };
  },
  getExpenses: async () => snap2arr(await getDocs(userCol('expenses'))),
  createExpense: async (data) => {
    const id = generateId();
    const record = sanitizeFirestoreData({ ...data, _id: id, expenseId: 'EXP-' + id.slice(0, 6), createdAt: new Date().toISOString() });
    await setDoc(userDocRef('expenses', id), record);
    return record;
  },
  deleteExpense: async (id) => {
    await deleteDoc(userDocRef('expenses', id));
    return { success: true };
  }
};

// ============================================================
// TAX API
// ============================================================
export const taxApi = {
  getSummary: async () => {
    const invoices = snap2arr(await getDocs(userCol('invoices')));
    const totalTax = invoices.reduce((s, i) => s + (i.totalTax || 0), 0);
    return { totalTax, cgst: totalTax / 2, sgst: totalTax / 2, igst: 0, invoiceCount: invoices.length };
  }
};

// ============================================================
// INVENTORY API
// ============================================================
export const inventoryApi = {
  getSuppliers: async () => snap2arr(await getDocs(userCol('suppliers'))),
  getWarehouses: async () => snap2arr(await getDocs(userCol('warehouses'))),
  getMovements: async () => snap2arr(await getDocs(userCol('movements'))),
  getBatches: async () => snap2arr(await getDocs(userCol('batches'))),
  getPurchases: async () => snap2arr(await getDocs(userCol('purchases'))),
  createItem: async (type, data) => {
    const id = generateId();
    const record = sanitizeFirestoreData({ ...data, _id: id, createdAt: new Date().toISOString() });
    await setDoc(doc(db, 'users', uid(), type, id), record);
    return record;
  },
  deleteItem: async (type, id) => {
    await deleteDoc(doc(db, 'users', uid(), type, id));
    return { success: true };
  }
};

// ============================================================
// AI API
// ============================================================
export const aiApi = {
  copilotChat: async () => {
    const invoices = snap2arr(await getDocs(userCol('invoices')));
    const customers = snap2arr(await getDocs(userCol('customers')));
    const products = snap2arr(await getDocs(userCol('products')));
    return { reply: `You have ${invoices.length} invoices, ${customers.length} customers, and ${products.length} products stored securely in the cloud.` };
  },
  getForecast: async () => ({ forecast: [] })
};

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
// AUTH API
// ============================================================
const ADMIN_EMAIL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAIL) || 'admin@yourbill.in';
const ADMIN_SECRET = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_BOOTSTRAP_SECRET) || 'admin@123';

const getUserProfile = async (userId) => {
  const snap = await getDoc(doc(db, 'users', userId, 'profile', 'main'));
  return snap.exists() ? { _id: userId, ...snap.data() } : null;
};

const setUserProfile = async (userId, data) => {
  const cleanData = sanitizeFirestoreData(data);
  await setDoc(doc(db, 'users', userId, 'profile', 'main'), cleanData, { merge: true });
};

export const authApi = {
  register: async ({ firstName, lastName, name, email, password, companyName, phone, gstin, address, city, state, pincode, adminBootstrapSecret }) => {
    const emailLower = (email || '').trim().toLowerCase();
    if (!emailLower || !password) throw new Error('Email and password are required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    let role = 'user';
    let plan = 'free';
    let subscriptionStatus = 'trial';
    if (emailLower === ADMIN_EMAIL.toLowerCase() || adminBootstrapSecret === ADMIN_SECRET) {
      role = 'admin';
      plan = 'enterprise';
      subscriptionStatus = 'active';
    }

    const cred = await createUserWithEmailAndPassword(auth, emailLower, password);
    const userId = cred.user.uid;
    const displayName = name || [firstName, lastName].filter(Boolean).join(' ') || emailLower.split('@')[0];

    const profile = sanitizeFirestoreData({
      _id: userId,
      email: emailLower,
      name: displayName,
      companyName: companyName || '',
      phone: phone || '',
      gstin: gstin || '',
      role,
      plan,
      subscriptionStatus,
      trialEndsAt: role === 'admin' ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    await setUserProfile(userId, profile);
    const token = await cred.user.getIdToken();
    localStorage.setItem('token', token);
    return { user: profile, token };
  },

  login: async ({ email, password }) => {
    if (!email || !password) throw new Error('Please enter your email and password.');
    const emailLower = email.trim().toLowerCase();
    const cred = await signInWithEmailAndPassword(auth, emailLower, password);
    const userId = cred.user.uid;

    let profile = await getUserProfile(userId);
    if (!profile) {
      profile = sanitizeFirestoreData({
        _id: userId,
        email: emailLower,
        name: cred.user.displayName || emailLower.split('@')[0],
        role: emailLower === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
        plan: emailLower === ADMIN_EMAIL.toLowerCase() ? 'enterprise' : 'free',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString()
      });
      await setUserProfile(userId, profile);
    }

    const token = await cred.user.getIdToken();
    localStorage.setItem('token', token);
    return { user: profile, token };
  },

  getMe: async () => {
    const user = auth.currentUser;
    if (!user) {
      const restored = await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
      });
      if (!restored) throw new Error('Not authenticated');
      const profile = await getUserProfile(restored.uid);
      if (!profile) throw new Error('User profile not found');
      return profile;
    }
    const profile = await getUserProfile(user.uid);
    if (!profile) throw new Error('User profile not found');
    return profile;
  },

  updateProfile: async (data) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const safe = { ...data };
    delete safe.password;
    delete safe._id;
    delete safe.email;
    await setUserProfile(user.uid, safe);
    return await getUserProfile(user.uid);
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    return { success: true };
  }
};

export const adminApi = {
  getShops: async () => {
    const usersSnap = await getDocs(collection(db, 'allUsers'));
    return snap2arr(usersSnap).map(data => ({
      ...data,
      shopName: data.companyName || data.name,
      daysUntilExpiry: 7
    }));
  },
  updateShop: async (id, data) => {
    const cleanData = sanitizeFirestoreData(data);
    await setDoc(doc(db, 'allUsers', id), cleanData, { merge: true });
    return { _id: id, ...cleanData };
  }
};