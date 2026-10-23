const production = process.env.NODE_ENV === 'production';

export const JWT_SECRET = process.env.JWT_SECRET || (production ? '' : 'local-development-only-secret-change-before-deploy');
const mongoHost = process.env.MONGODB_HOST;
const mongoUser = process.env.MONGODB_USER;
const mongoPassword = process.env.MONGODB_PASSWORD;
const renderMongoUri = mongoHost && mongoUser && mongoPassword
  ? `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:27017/yourbill?authSource=admin`
  : '';
export const MONGODB_URI = process.env.MONGODB_URI || renderMongoUri || (production ? '' : 'mongodb://localhost:27017/yourbill');

if (production && !JWT_SECRET) throw new Error('JWT_SECRET must be configured in production.');
if (production && !MONGODB_URI) throw new Error('MONGODB_URI must be configured in production.');
if (production && !String(process.env.ADMIN_EMAIL || '').trim()) throw new Error('ADMIN_EMAIL must be configured in production.');
if (production && !String(process.env.ADMIN_BOOTSTRAP_SECRET || '').trim()) throw new Error('ADMIN_BOOTSTRAP_SECRET must be configured in production.');
if (production && !String(process.env.FRONTEND_ORIGIN || '').trim()) throw new Error('FRONTEND_ORIGIN must be configured in production.');

