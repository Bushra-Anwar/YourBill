const planRanks = { starter: 1, professional: 2, enterprise: 3, 'enterprise pro': 3 };

const planFeatures = {
  1: new Set(['Dashboard', 'CustomerManagement', 'InvoiceManagement', 'QuotationManagement', 'PaymentManagement', 'DocumentManagement', 'ProductServiceManagement', 'POSBilling']),
  2: new Set(['Dashboard', 'CustomerManagement', 'InvoiceManagement', 'QuotationManagement', 'PaymentManagement', 'EcommerceIntegration', 'NotificationsManagement', 'DocumentManagement', 'ProductServiceManagement', 'InventoryManagement', 'AccountingManagement', 'TaxManagement', 'ReportsAnalytics', 'POSBilling']),
  3: new Set(['Dashboard', 'CustomerManagement', 'InvoiceManagement', 'QuotationManagement', 'PaymentManagement', 'EcommerceIntegration', 'NotificationsManagement', 'DocumentManagement', 'ProductServiceManagement', 'InventoryManagement', 'AccountingManagement', 'TaxManagement', 'ReportsAnalytics', 'AIFeatures', 'AdvancedFeatures', 'POSBilling'])
};

export const isAdminAccount = user => String(user?.role || user?.userType || '').toLowerCase().replace(/[\s_-]/g, '') === 'admin';

export const hasFeatureAccess = (user, feature) => {
  if (!user) return false;
  if (isAdminAccount(user)) return true;
  const planName = String(user.plan || '').toLowerCase();
  const rank = planRanks[planName] || 1;
  return Boolean(planFeatures[rank]?.has(feature));
};

export const getPlanName = user => user?.plan || 'Starter';
