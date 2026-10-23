import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import invoiceRoutes from './routes/invoiceRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import accountingRoutes from './routes/accountingRoutes.js';
import taxRoutes from './routes/taxRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { migrateLegacyDocuments } from './seedData.js';
import { protect, requirePlan } from './middleware/authMiddleware.js';
import { MONGODB_URI } from './config.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Middleware
const allowedOrigins = [
  ...String(process.env.FRONTEND_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://127.0.0.1:5177'])
];
app.use(cors({ origin: (origin, callback) => {
  // In development, allow any localhost origin dynamically
  if (!origin) return callback(null, true);
  if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('This site is not allowed to access the API.'));
} }));
app.use(express.json({ limit: '1mb' }));

let databaseReady = false;

// API Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/inventory', protect, requirePlan('Professional'), inventoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/accounting', protect, requirePlan('Professional'), accountingRoutes);
app.use('/api/tax', protect, requirePlan('Professional'), taxRoutes);
app.use('/api/ai', protect, requirePlan('Enterprise'), aiRoutes);
app.use('/api/admin', adminRoutes);

// Health Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'YourBill Enterprise SaaS Engine',
    version: '2.0.0',
    timestamp: new Date()
  });
});

app.get('/healthz', (_req, res) => res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ready' : 'starting' }));

const startServer = async () => {
  await mongoose.connect(MONGODB_URI);
  await migrateLegacyDocuments();
  databaseReady = true;
  app.listen(PORT, '0.0.0.0', () => console.log(`YourBill API ready on port ${PORT}`));
};

startServer().catch(error => {
  console.error('API startup failed:', error.message);
  process.exit(1);
});
