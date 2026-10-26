import { useState, useEffect, useContext, useRef } from 'react';
import { Sun, Moon, UsersRound, ShoppingCart, ReceiptText, FilePenLine, CreditCard, Bell, Files, Package, Warehouse, BookOpen, Landmark, BarChart3, Sparkles, Settings, RefreshCw, ShieldCheck, Rocket, Search, UserRound, Crown, LayoutDashboard, Compass, LogIn, UserPlus, House, SlidersHorizontal, ArrowRight, Menu, X, LockKeyhole, Building2 } from 'lucide-react';
import { AuthContext } from './context/AuthContextValue';
import './index.css';
import CustomerManagement from './components/CustomerManagement';
import ProductServiceManagement from './components/ProductServiceManagement';
import InvoiceManagement from './components/InvoiceManagement';
import QuotationManagement from './components/QuotationManagement';
import PaymentManagement from './components/PaymentManagement';
import PaymentTracking from './components/PaymentTracking';
import TaxManagement from './components/TaxManagement';
import InventoryManagement from './components/InventoryManagement';
import ReportsAnalytics from './components/ReportsAnalytics';
import UserManagement from './components/UserManagement';
import NotificationsManagement from './components/NotificationsManagement';
import DocumentManagement from './components/DocumentManagement';
import AccountingManagement from './components/AccountingManagement';
import SubscriptionManagement from './components/SubscriptionManagement';
import EcommerceIntegration from './components/EcommerceIntegration';
import AdminPanel from './components/AdminPanel';
import AdvancedFeatures from './components/AdvancedFeatures';
import AIFeatures from './components/AIFeatures';
import MainDashboard from './components/MainDashboard';
import POSBilling from './components/POSBilling';
import SubscriptionDemo from './components/SubscriptionDemo';
import Login from './components/Login';
import Registration from './components/Registration';
import ProfileSettings from './components/ProfileSettings';
import AdminShops from './components/AdminShops';
import { hasFeatureAccess, isAdminAccount, getPlanName } from './subscriptionAccess';
import { adminApi } from './api';

const featureIconMap = {
  '👥': UsersRound, '🛒': ShoppingCart, '📄': ReceiptText, '📝': FilePenLine,
  '💳': CreditCard, '🔔': Bell, '📑': Files, '📦': Package, '🏢': Warehouse,
  '📘': BookOpen, '🏛️': Landmark, '📊': BarChart3, '✨': Sparkles,
  '⚙️': Settings, '🔄': RefreshCw, '🔐': ShieldCheck, '🚀': Rocket
};
function FeatureIcon({ icon }) {
  const Icon = featureIconMap[icon] || Sparkles;
  return <Icon size={24} strokeWidth={1.7} aria-hidden="true" />;
}
const categoryTabMap = {
  "Customer Management": "CustomerManagement",
  "E-commerce Integration": "EcommerceIntegration",
  "Invoice Management": "InvoiceManagement",
  "Quotation & Estimates": "QuotationManagement",
  "Payment Features": "PaymentManagement",
  "Notifications": "NotificationsManagement",
  "Document Features": "DocumentManagement",
  "Product & Service Management": "ProductServiceManagement",
  "Inventory Features": "InventoryManagement",
  "Accounting Features": "AccountingManagement",
  "Tax Features": "TaxManagement",
  "Reports & Analytics": "ReportsAnalytics",
  "AI Features (Modern)": "AIFeatures",
  "Admin Panel": "AdminPanel",
  "Subscription Billing (SaaS)": "SubscriptionManagement",
  "User Management": "UserManagement",
  "Advanced Features": "AdvancedFeatures"
};
const adminFeatures = [
  {
    category: "Admin Panel",
    icon: "⚙️",
    items: ["System settings", "Tax configuration", "Invoice templates", "Currency settings", "Backup management", "User permissions"]
  },
  {
    category: "Subscription Billing (SaaS)",
    icon: "🔄",
    items: ["Monthly subscriptions", "Annual subscriptions", "Automatic renewals", "Proration", "Coupons", "Free trials", "Subscription analytics"]
  },
  {
    category: "User Management",
    icon: "🔐",
    items: ["Multi-user accounts", "Role-based permissions", "Admin", "Manager", "Accountant", "Salesperson", "Audit logs", "Activity tracking"]
  },
  {
    category: "Advanced Features",
    icon: "🚀",
    items: ["Multi-company support", "Multi-currency support", "Multi-language support", "Dark mode", "API access", "Webhooks", "Data export/import", "Mobile responsive design"]
  }
];

const sellerFeatures = [
  {
    category: "Product & Service Management",
    icon: "📦",
    items: ["Product catalog", "Categories", "SKU management", "Barcode support", "Stock tracking", "Service items", "Product pricing"]
  },
  {
    category: "Inventory Features",
    icon: "🏢",
    items: ["Stock in/out", "Purchase management", "Supplier management", "Low stock alerts", "Inventory valuation", "Batch tracking"]
  },
  {
    category: "Accounting Features",
    icon: "📘",
    items: ["Chart of accounts", "Journal entries", "Ledger management", "Expense tracking", "Bank reconciliation", "Trial balance"]
  },
  {
    category: "Tax Features",
    icon: "🏛️",
    items: ["GST support", "CGST/SGST/IGST calculations", "VAT support", "Multiple tax rates", "Tax reports", "HSN/SAC codes"]
  },
  {
    category: "Reports & Analytics",
    icon: "📊",
    items: ["Daily sales", "Monthly sales", "Profit & loss", "Balance sheet", "Cash flow", "Tax summary", "Expense reports"]
  },
  {
    category: "AI Features (Modern)",
    icon: "✨",
    items: ["AI invoice generation", "Expense categorization", "Revenue forecasting", "Smart payment reminders", "Business insights"]
  }
];

const buyerFeatures = [
  { category: "Customer Management", icon: "👥" },
  { category: "E-commerce Integration", icon: "🛒" },
  { category: "Invoice Management", icon: "📄" },
  { category: "Quotation & Estimates", icon: "📝" },
  { category: "Payment Features", icon: "💳" },
  { category: "Notifications", icon: "🔔" },
  { category: "Document Features", icon: "📑" }
];

function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('yourbill-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  const [activeTab, setActiveTab] = useState('Home');
  const [activeFeatureTier, setActiveFeatureTier] = useState('buyer');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const profileRef = useRef(null);
  const [clockNow, setClockNow] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [loginGateFeature, setLoginGateFeature] = useState('');

  // Tabs that require login before opening
  const protectedTabs = ['CustomerManagement', 'ProductServiceManagement', 'InvoiceManagement',
    'QuotationManagement', 'PaymentManagement', 'PaymentTracking', 'TaxManagement',
    'InventoryManagement', 'ReportsAnalytics', 'UserManagement', 'NotificationsManagement',
    'DocumentManagement', 'AccountingManagement', 'SubscriptionManagement', 'EcommerceIntegration',
    'AdminPanel', 'AdvancedFeatures', 'AIFeatures', 'POSBilling', 'Dashboard', 'AdminShops', 'ProfileSettings'];

  const handleFeatureClick = (tab, featureName) => {
    if (!user && protectedTabs.includes(tab)) {
      setLoginGateFeature(featureName || tab);
      setShowLoginGate(true);
      return;
    }
    setActiveTab(tab);
  };

  const searchableFeatures = [
    { tab: 'AdminPanel', icon: '⚙️', name: 'Admin Panel & Settings', keywords: 'system tax invoice currency backup user permission settings' },
    { tab: 'SubscriptionManagement', icon: '🔄', name: 'Subscription Billing', keywords: 'monthly annual automatic renewals proration coupons free trials analytics' },
    { tab: 'UserManagement', icon: '🔐', name: 'User Management', keywords: 'multi user accounts role based permissions admin manager accountant salesperson audit logs tracking' },
    { tab: 'AdvancedFeatures', icon: '🚀', name: 'Advanced Features', keywords: 'multi company currency language dark mode api access webhooks data export import mobile responsive' },
    { tab: 'ProductServiceManagement', icon: '📦', name: 'Product & Service Management', keywords: 'catalog categories sku barcode stock tracking service items pricing' },
    { tab: 'InventoryManagement', icon: '🏢', name: 'Inventory & Stock', keywords: 'stock in out purchase supplier low alerts valuation batch' },
    { tab: 'AccountingManagement', icon: '📘', name: 'Accounting & Ledger', keywords: 'chart accounts journal entries ledger expense tracking bank reconciliation trial balance' },
    { tab: 'TaxManagement', icon: '🏛️', name: 'Tax & GST Features', keywords: 'gst cgst sgst igst calculations vat multiple rates reports hsn sac codes' },
    { tab: 'ReportsAnalytics', icon: '📊', name: 'Reports & Analytics', keywords: 'daily monthly sales profit loss balance sheet cash flow tax summary expense reports' },
    { tab: 'AIFeatures', icon: '✨', name: 'AI Features (Modern)', keywords: 'ai invoice generation expense categorization revenue forecasting smart payment reminders insights' },
    { tab: 'POSBilling', icon: '⚡', name: 'POS Fast Billing Register', keywords: 'pos point of sale barcode quick cash tender thermal print' },
    { tab: 'CustomerManagement', icon: '👥', name: 'Customer Management', keywords: 'buyers clients crm' },
    { tab: 'EcommerceIntegration', icon: '🛒', name: 'E-commerce Integration', keywords: 'online shop store sync' },
    { tab: 'InvoiceManagement', icon: '📄', name: 'Invoice Management', keywords: 'billing bills invoices create generate' },
    { tab: 'QuotationManagement', icon: '📝', name: 'Quotation & Estimates', keywords: 'quotes estimates proposals' },
    { tab: 'PaymentManagement', icon: '💳', name: 'Payment Features', keywords: 'collect pay payments gateway' },
    { tab: 'NotificationsManagement', icon: '🔔', name: 'Notifications', keywords: 'alerts emails sms' },
    { tab: 'DocumentManagement', icon: '📑', name: 'Document Features', keywords: 'print pdf export documents' }
  ];

  const { user, logout } = useContext(AuthContext);
  const isAdminUser = isAdminAccount(user);
  const [adminExpiryShops, setAdminExpiryShops] = useState([]);

  useEffect(() => {
    if (!isAdminUser) return undefined;
    let active = true;
    const refreshExpiryAlerts = async () => {
      try {
        const shops = await adminApi.getShops();
        if (active) setAdminExpiryShops(shops.filter(shop => shop.renewalDueSoon));
      } catch {
        if (active) setAdminExpiryShops([]);
      }
    };
    refreshExpiryAlerts();
    const timer = window.setInterval(refreshExpiryAlerts, 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAdminUser, user?.id, user?._id, user?.email]);

  const filteredResults = searchQuery.trim() === '' ? [] : searchableFeatures.filter(f =>
    (!user || hasFeatureAccess(user, f.tab)) &&
    (f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.keywords.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('yourbill-theme', theme); } catch { /* Session-only theme. */ }
  }, [theme]);

  useEffect(() => {
    if (!user?.trialEndsAt && !user?.subscriptionEndsAt) return undefined;
    const updateClock = () => setClockNow(Date.now());
    const initialTimer = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, 1000);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); };
  }, [user?.trialEndsAt, user?.subscriptionEndsAt]);

  useEffect(() => {
    if (!showProfile) return undefined;
    const closeOutside = event => { if (!profileRef.current?.contains(event.target)) setShowProfile(false); };
    const closeOnEscape = event => { if (event.key === 'Escape') setShowProfile(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showProfile]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const appWorkspaceTabs = ['Dashboard', 'CustomerManagement', 'InvoiceManagement', 'QuotationManagement', 'PaymentManagement', 'EcommerceIntegration', 'NotificationsManagement', 'DocumentManagement', 'ProductServiceManagement', 'AccountingManagement', 'TaxManagement', 'InventoryManagement', 'ReportsAnalytics', 'UserManagement', 'AdminPanel', 'AdvancedFeatures', 'AIFeatures', 'POSBilling', 'ProfileSettings', 'SubscriptionManagement', 'AdminShops'];
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt).getTime() : NaN;
  const subscriptionEndsAt = user?.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).getTime() : NaN;
  const subscriptionExpired = !isAdminUser && (user?.subscriptionStatus === 'expired' || (user?.subscriptionStatus === 'trial' && Number.isFinite(trialEndsAt) && clockNow >= trialEndsAt) || (user?.subscriptionStatus === 'active' && Number.isFinite(subscriptionEndsAt) && clockNow >= subscriptionEndsAt));
  const requirePlan = subscriptionExpired && appWorkspaceTabs.includes(activeTab);
  const featureBlocked = user && appWorkspaceTabs.includes(activeTab) && !hasFeatureAccess(user, activeTab);
  const showPlanGate = requirePlan || featureBlocked;
  const workspaceMenuFeatures = [
    { tab: 'Dashboard', name: 'Dashboard', icon: '📊' },
    ...searchableFeatures.map(({ tab, name, icon }) => ({ tab, name, icon })),
    ...(isAdminUser ? [{ tab: 'AdminShops', name: 'All Shops & Data', icon: '🏬' }] : [])
  ].filter((feature, index, list) => list.findIndex(item => item.tab === feature.tab) === index && hasFeatureAccess(user, feature.tab));

  return (
    <>
      {showPlanGate ? (
        <SubscriptionDemo onBack={() => setActiveTab('Home')} onLogin={() => setActiveTab('Login')} onRegister={() => setActiveTab('Registration')} />
      ) : activeTab === 'Dashboard' ? (
        <MainDashboard setActiveTab={setActiveTab} theme={theme} toggleTheme={toggleTheme} />
      ) : (
        <div className="app-container">
          <nav className="navbar">
            <div className="nav-brand">
              {user && <button type="button" className="workspace-menu-toggle" aria-label="Open workspace features" aria-expanded={showWorkspaceMenu} onClick={() => setShowWorkspaceMenu(open => !open)}><Menu size={20} /></button>}
              <span className="rainbow-text logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('Home')}>YourBill</span>
            </div>
            <div className="nav-links">
              <button className={`nav-link ${activeTab === 'Home' ? 'active' : ''}`} onClick={() => setActiveTab('Home')}><House size={16} aria-hidden="true" /> Main</button>
              <button className={`nav-link ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => handleFeatureClick('Dashboard', 'Dashboard')}><LayoutDashboard size={16} aria-hidden="true" /> Dashboard</button>
              <button className={`nav-link ${activeTab === 'Explore' ? 'active' : ''}`} onClick={() => setActiveTab('Explore')}><Compass size={16} aria-hidden="true" /> Explore</button>
              <button className={`nav-link ${activeTab === 'Login' ? 'active' : ''}`} onClick={() => setActiveTab('Login')}><LogIn size={16} aria-hidden="true" /> Login</button>
              <button className={`nav-link ${activeTab === 'Registration' ? 'active' : ''}`} onClick={() => setActiveTab('Registration')}><UserPlus size={16} aria-hidden="true" /> Registration</button>
            </div>
            <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="search-bar-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span className="search-icon" style={{ position: 'absolute', left: '10px' }}><Search size={16} aria-hidden="true" /></span>
                <input
                  type="text"
                  placeholder="Search features, tools (e.g. GST, AI)..."
                  className="universal-search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  style={{ padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)', width: '250px' }}
                />
                {showSearchDropdown && searchQuery.trim() !== '' && (
                  <div className="search-dropdown fade-in" style={{ position: 'absolute', top: '45px', left: 0, width: '350px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.5rem', zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    {filteredResults.length > 0 ? (
                      <div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7, padding: '0.5rem', marginBottom: '0.2rem' }}>✨ AI Search Results for "{searchQuery}"</div>
                        {filteredResults.map((result, idx) => (
                          <div
                            key={idx}
                            onClick={() => { setActiveTab(result.tab); setSearchQuery(''); setShowSearchDropdown(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', cursor: 'pointer', borderRadius: '8px', transition: '0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span className="search-result-icon"><FeatureIcon icon={result.icon} /></span>
                            <div>
                              <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{result.name}</div>
                              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.keywords}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.7 }}>
                        No matches found. Try "Invoice" or "GST".
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button className="upgrade-btn header-btn" onClick={() => setActiveTab('SubscriptionDemo')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(45deg, #FFD700, #FDB931)', color: '#000', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                <Crown size={16} aria-hidden="true" /> Subscription
              </button>
              <button className="theme-toggle header-btn" type="button" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                {theme === 'light' ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
              </button>
              <div className="notification-wrapper" style={{ position: 'relative' }}>
                <div className="notification-bell header-btn" role="button" tabIndex={0} aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)} onKeyDown={(event) => event.key === 'Enter' && setShowNotifications(!showNotifications)} style={{ cursor: 'pointer', fontSize: '1.2rem', position: 'relative' }}>
                  <Bell size={19} aria-hidden="true" /> {isAdminUser && adminExpiryShops.length > 0 && <span className="badge" style={{ position: 'absolute', top: '-5px', right: '-10px', background: '#dc2626', color: 'white', borderRadius: '50%', padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>{adminExpiryShops.length}</span>}
                </div>
                {showNotifications && (
                  <div className="dropdown-menu fade-in" style={{ position: 'absolute', right: 0, top: '40px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '1rem', width: '250px', zIndex: 100 }}>
                    <div className="dropdown-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Notifications</div>
                    {isAdminUser && adminExpiryShops.length > 0 ? adminExpiryShops.map(shop => <button type="button" className="dropdown-item" key={shop._id} onClick={() => { setShowNotifications(false); setActiveTab('AdminShops'); }}><strong>{shop.companyName}</strong>: {shop.subscriptionStatus === 'trial' ? 'trial' : shop.plan} {shop.daysUntilExpiry === 0 ? 'expires today' : `expires in ${shop.daysUntilExpiry} day${shop.daysUntilExpiry === 1 ? '' : 's'}`}</button>) : <div className="dropdown-item">{isAdminUser ? 'No subscriptions expiring within 7 days.' : 'No new notifications.'}</div>}
                  </div>
                )}
              </div>

              <div className="profile-wrapper" ref={profileRef} onMouseLeave={() => setShowProfile(false)} style={{ position: 'relative' }}>
                <button type="button" className="profile-avatar" aria-label="Open profile menu" aria-expanded={showProfile} onClick={() => setShowProfile(open => !open)} title={user?.name || user?.email || 'Profile'} style={{ cursor: 'pointer', fontSize: '1.1rem', fontWeight: 750, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', padding: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
                  {user ? (user.name || user.firstName || 'U')[0].toUpperCase() : <UserRound size={20} aria-hidden="true" />}
                </button>
                {showProfile && (
                  <div className="dropdown-menu fade-in profile-role-menu" style={{ position: 'absolute', right: 0, top: '46px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '.45rem 0', width: 'min(290px, calc(100vw - 24px))', zIndex: 1000 }}>
                    <div className="dropdown-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      <strong>{user ? (user.name || user.firstName || 'My Profile') : 'My Profile'}</strong>
                      {user?.email && <small style={{ display: 'block', marginTop: '.25rem', fontWeight: 400 }}>{user.email}</small>}
                      {user?.companyName && <small style={{ display: 'block', marginTop: '.15rem', fontWeight: 400 }}>{user.companyName}</small>}
                    </div>
                    {user && (isAdminUser ? (
                      <>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('AdminPanel'); }}><Settings size={15} /> Admin Console</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('UserManagement'); }}><UsersRound size={15} /> Team & Access</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('AdminShops'); }}><Building2 size={15} /> All Shops & Data</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('SubscriptionManagement'); }}><Crown size={15} /> Client Plans</div>
                      </>
                    ) : (
                      <>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('InvoiceManagement'); }}><ReceiptText size={15} /> My Invoices</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('ProductServiceManagement'); }}><Package size={15} /> Products & Stock</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('ReportsAnalytics'); }}><BarChart3 size={15} /> Business Reports</div>
                      </>
                    ))}
                    {user?.subscriptionStatus === 'trial' && user?.trialEndsAt && <div className="dropdown-item" style={{ cursor: 'default' }}><Crown size={15} /> Free trial · ends {new Date(user.trialEndsAt).toLocaleDateString()}</div>}
                    <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab(user ? 'ProfileSettings' : 'Login'); }}><SlidersHorizontal size={15} /> Profile & Settings</div>
                    {user ? (
                      <div className="dropdown-item" onClick={() => { logout(); setActiveTab('Home'); }}>Log Out</div>
                    ) : (
                      <div className="dropdown-item" onClick={() => setActiveTab('Login')}>Log In</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </nav>

          {showWorkspaceMenu && user && <>
            <button className="workspace-menu-scrim" aria-label="Close workspace menu" onClick={() => setShowWorkspaceMenu(false)} />
            <aside className="workspace-feature-drawer" aria-label="Workspace features">
              <header><div><strong>{user.companyName || user.shopName || 'Your Business'}</strong><small>{isAdminUser ? 'Administrator · all platform features' : `${getPlanName(user)} plan · included features`}</small></div><button type="button" onClick={() => setShowWorkspaceMenu(false)} aria-label="Close features"><X size={18} /></button></header>
              <div className="workspace-feature-list">{workspaceMenuFeatures.map(feature => <button key={feature.tab} type="button" onClick={() => { setShowWorkspaceMenu(false); setActiveTab(feature.tab); }}><span>{feature.icon}</span>{feature.name}</button>)}</div>
              {!isAdminUser && <button type="button" className="workspace-upgrade-link" onClick={() => { setShowWorkspaceMenu(false); setActiveTab('SubscriptionDemo'); }}><LockKeyhole size={15} /> Compare plans & unlock more</button>}
            </aside>
          </>}

          <main className="main-content">
            {activeTab === 'Home' && (
              <div className="home-view fade-in">
                <header className="hero hero-advanced">
                  <div className="hero-copy">
                    <span className="hero-kicker"><span className="hero-kicker-dot" /> BILLING THAT KEEPS BUSINESS MOVING</span>
                    <h1 className="hero-title">Less time on billing.<br /><span className="rainbow-text">More room to grow.</span></h1>
                    <p className="hero-subtitle">Create invoices, keep payments organized, and stay on top of stock from one connected business workspace.</p>
                    <div className="hero-actions">
                      <button className="btn-primary rainbow-bg" onClick={() => setActiveTab('Registration')}>Get Started <span aria-hidden="true">↗</span></button>
                      <button className="btn-secondary" onClick={() => setActiveTab('Explore')}>Explore features <span aria-hidden="true">↘</span></button>
                    </div>
                    <div className="hero-capabilities"><span>INVOICING</span><i /><span>PAYMENTS</span><i /><span>INVENTORY</span></div>
                  </div>
                  <div className="hero-visual" aria-label="Decorative sample billing workspace preview">
                    <div className="hero-visual-orbit hero-orbit-a" aria-hidden="true" />
                    <div className="hero-visual-orbit hero-orbit-b" aria-hidden="true" />
                    <div className="hero-float-tag hero-tag-invoice"><span>▤</span> Invoices</div>
                    <div className="hero-float-tag hero-tag-stock"><span>₹</span> Payment tracking</div>
                    <div className="hero-float-tag hero-tag-insights"><span>↗</span> Business insights</div>
                    <div className="hero-interface-card">
                      <div className="hero-interface-top"><span className="hero-interface-mark">Y</span><strong>YourBill</strong><span className="hero-window-dots">•••</span></div>
                      <div className="hero-interface-body">
                        <div className="hero-interface-label">SAMPLE PREVIEW · NOT ACCOUNT DATA</div>
                        <div className="hero-interface-title">Your business, in view</div>
                        <div className="hero-interface-rule wide" /><div className="hero-interface-rule" />
                        <div className="hero-interface-panels"><span /><span /><span /></div>
                        <div className="hero-interface-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
                      </div>
                    </div>
                  </div>
                </header>
                <section className="subscription-promo" aria-labelledby="subscription-promo-title">
                  <div className="subscription-promo-copy">
                    <span className="subscription-promo-eyebrow"><Sparkles size={14} aria-hidden="true" /> GROW WITH YOUR BUSINESS</span>
                    <h2 id="subscription-promo-title">Spend less time managing bills. <span>Get more room to grow.</span></h2>
                    <p>Choose a YourBill plan for the tools your team needs—from everyday invoicing to deeper stock, tax, and business reporting.</p>
                    <div className="subscription-promo-actions">
                      <button className="btn-primary rainbow-bg" onClick={() => setActiveTab(user ? 'SubscriptionDemo' : 'Registration')}>Try 7 days free <ArrowRight size={16} aria-hidden="true" /></button>
                      <button className="btn-secondary" onClick={() => setActiveTab('SubscriptionDemo')}>Compare plans <Crown size={16} aria-hidden="true" /></button>
                      <span>Full access for 7 days · no card required</span>
                    </div>
                  </div>
                  <div className="subscription-promo-benefits">
                    <div><ReceiptText size={19} aria-hidden="true" /><span><strong>For solo businesses</strong><small>Keep invoices, buyers, and products together.</small></span></div>
                    <div><Warehouse size={19} aria-hidden="true" /><span><strong>For growing teams</strong><small>Bring stock, tax, and reports into one flow.</small></span></div>
                    <div><BarChart3 size={19} aria-hidden="true" /><span><strong>For larger operations</strong><small>Give teams clearer access and business insights.</small></span></div>
                  </div>
                </section>
              </div>
            )}

            {(activeTab === 'Explore' || activeTab === 'Home') && (
              <div className="explore-view fade-in" style={{ marginTop: activeTab === 'Home' ? '2rem' : '0' }}>
                <section className="features-section">
                  <div className="section-header">
                    <h2>One platform. Three worlds.</h2>
                    <p>Move through the people, tools, and systems behind your business.</p>
                  </div>

                  <section className={`motion-world motion-world-${activeFeatureTier}`} aria-label="Explore business workspaces">
                    <div className="motion-world-topline"><span>YOUR BUSINESS UNIVERSE</span><span className="motion-live-indicator"><i /> LIVE WORKSPACE</span></div>
                    <div className="motion-world-tabs" role="tablist" aria-label="Business workspace">
                      <button className={activeFeatureTier === 'buyer' ? 'active' : ''} role="tab" aria-selected={activeFeatureTier === 'buyer'} onClick={() => setActiveFeatureTier('buyer')}><span>01</span> Buyer</button>
                      <button className={activeFeatureTier === 'seller' ? 'active' : ''} role="tab" aria-selected={activeFeatureTier === 'seller'} onClick={() => setActiveFeatureTier('seller')}><span>02</span> Seller</button>
                      <button className={activeFeatureTier === 'admin' ? 'active' : ''} role="tab" aria-selected={activeFeatureTier === 'admin'} onClick={() => setActiveFeatureTier('admin')}><span>03</span> Admin</button>
                    </div>
                    <div className="motion-world-stage" key={activeFeatureTier}>
                      <div className="motion-world-copy">
                        <div className="motion-world-index">{activeFeatureTier === 'buyer' ? '01 / CUSTOMER EXPERIENCE' : activeFeatureTier === 'seller' ? '02 / BUSINESS OPERATIONS' : '03 / PLATFORM CONTROL'}</div>
                        <h3>{activeFeatureTier === 'buyer' ? 'Every sale starts with a connection.' : activeFeatureTier === 'seller' ? 'All your operations, in orbit.' : 'A clear view of the whole system.'}</h3>
                        <p>{activeFeatureTier === 'buyer' ? 'Turn customer conversations into quotes, invoices, and payments with one connected flow.' : activeFeatureTier === 'seller' ? 'Bring products, stock, accounts, and reports into one workspace that stays in sync.' : 'Shape access, subscriptions, and system settings from a focused control center.'}</p>
                        <button className="motion-world-link" onClick={() => document.getElementById(`tier-${activeFeatureTier}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Explore this workspace <span>↘</span></button>
                      </div>
                      <div className="motion-world-object" aria-hidden="true">
                        <div className="motion-object-halo" />
                        <div className="motion-object-ring ring-one" /><div className="motion-object-ring ring-two" />
                        <div className="motion-object-core"><span>{activeFeatureTier === 'buyer' ? 'BILL' : activeFeatureTier === 'seller' ? 'STOCK' : 'CORE'}</span><i /></div>
                        <div className="motion-object-satellite satellite-one">{activeFeatureTier === 'buyer' ? '₹' : activeFeatureTier === 'seller' ? '▦' : '⌘'}</div>
                        <div className="motion-object-satellite satellite-two">{activeFeatureTier === 'buyer' ? '↗' : activeFeatureTier === 'seller' ? '◇' : '✓'}</div>
                      </div>
                    </div>
                  </section>

                  <div className="tier-section" id="tier-buyer">
                    <div className="tier-header">
                      <h3>1. Buyer Operations</h3>
                      <p>End-user interactions and sales tools</p>
                    </div>
                    <div className="bottom-cascade-wrapper">
                      <div className="curved-bg-top"></div>
                      <div className="buyer-cascade">
                        {buyerFeatures.map((feature, index) => (
                          <div key={index} className={`cascade-item cascade-${index + 1}`} onClick={() => handleFeatureClick(categoryTabMap[feature.category] || 'Login', feature.category)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleFeatureClick(categoryTabMap[feature.category] || 'Login', feature.category); } }}>
                            <div className="feature-icon"><FeatureIcon icon={feature.icon} /></div>
                            <h4>{feature.category}</h4>
                          </div>
                        ))}
                      </div>
                      <div className="curved-bg-bottom"></div>
                    </div>
                  </div>

                  <div className="tier-section" id="tier-seller">
                    <div className="tier-header">
                      <h3>2. Client Workspace (Seller)</h3>
                      <p>Business operations for your subscribed sellers</p>
                    </div>
                    <div className="explore-bento-grid client-grid">
                      {sellerFeatures.map((feature, index) => {
                        const isLargeCard = index === 2 || index === 5;
                        return (
                          <div key={index} className={`bento-item bento-${index + 1} ${isLargeCard ? 'large-card' : ''}`} onClick={() => handleFeatureClick(categoryTabMap[feature.category] || 'Login', feature.category)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleFeatureClick(categoryTabMap[feature.category] || 'Login', feature.category); } }}>
                            <div className="feature-icon"><FeatureIcon icon={feature.icon} /></div>
                            <div className="feature-content">
                              <h3 className="feature-title">{feature.category}</h3>
                              {isLargeCard ? (
                                <ul className="feature-list">
                                  {feature.items.slice(0, 6).map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="bento-desc">{feature.items.length} powerful modules and tools included in this feature.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(!user || isAdminUser) && <div className="tier-section" id="tier-admin">
                    <div className="tier-header">
                      <h3>3. SaaS Administration</h3>
                      <p>Platform management tools for the main Admin</p>
                    </div>
                    <div className="admin-bento-grid">
                      {adminFeatures.map((feature, index) => (
                        <div key={index} className="bento-item admin-card" onClick={() => setActiveTab(categoryTabMap[feature.category] || 'Login')} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveTab(categoryTabMap[feature.category] || 'Login'); } }}>
                          <div className="feature-icon"><FeatureIcon icon={feature.icon} /></div>
                          <div className="feature-content">
                            <h3 className="feature-title">{feature.category}</h3>
                            <ul className="feature-list">
                              {feature.items.slice(0, 6).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>}

                </section>
              </div>
            )}

            {activeTab === 'CustomerManagement' && (
              <CustomerManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'ProductServiceManagement' && (
              <ProductServiceManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'InvoiceManagement' && (
              <InvoiceManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'QuotationManagement' && (
              <QuotationManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'PaymentManagement' && (
              <PaymentManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'PaymentTracking' && (
              <PaymentTracking onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'TaxManagement' && (
              <TaxManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'InventoryManagement' && (
              <InventoryManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'ReportsAnalytics' && (
              <ReportsAnalytics onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'UserManagement' && (
              <UserManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'AdminShops' && <AdminShops onBack={() => setActiveTab('Dashboard')} />}

            {activeTab === 'NotificationsManagement' && (
              <NotificationsManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'DocumentManagement' && (
              <DocumentManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'AccountingManagement' && (
              <AccountingManagement onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'SubscriptionManagement' && (
              <SubscriptionManagement onBack={() => setActiveTab('Home')} onChoosePlan={() => setActiveTab('SubscriptionDemo')} />
            )}

            {activeTab === 'EcommerceIntegration' && (
              <EcommerceIntegration onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'AdminPanel' && (
              <AdminPanel onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'AdvancedFeatures' && (
              <AdvancedFeatures onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'AIFeatures' && (
              <AIFeatures onBack={() => setActiveTab('Dashboard')} />
            )}

            {activeTab === 'POSBilling' && (
              <POSBilling onBack={() => setActiveTab('Dashboard')} onInvoiceGenerated={() => setActiveTab('InvoiceManagement')} />
            )}

            {activeTab === 'SubscriptionDemo' && (
              <SubscriptionDemo onBack={() => setActiveTab('Home')} onLogin={() => setActiveTab('Login')} onRegister={() => setActiveTab('Registration')} />
            )}

            {activeTab === 'Login' && <Login setActiveTab={setActiveTab} />}

            {activeTab === 'Registration' && <Registration setActiveTab={setActiveTab} />}

            {activeTab === 'ProfileSettings' && <ProfileSettings onBack={() => setActiveTab('Home')} theme={theme} toggleTheme={toggleTheme} />}
          </main>

          <footer className="footer">
            <p>&copy; 2026 YourBill. Crafted with <span className="rainbow-text">innovation</span>.</p>
          </footer>
        </div>
      )}

      {/* ── Login Gate Modal ── */}
      {showLoginGate && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowLoginGate(false)}
          role="dialog" aria-modal="true" aria-label="Login required"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--glass-bg, #fff)', border: '1px solid var(--glass-border, #ddd)',
              borderRadius: '18px', padding: '2.5rem 2rem', width: 'min(420px, 92vw)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)', textAlign: 'center',
              animation: 'fadeInUp 0.25s ease'
            }}
          >
            <div style={{ fontSize: '2.8rem', marginBottom: '0.6rem' }}>🔐</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              Login Required
            </h2>
            <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '0.2rem', fontSize: '0.95rem' }}>
              <strong style={{ color: 'var(--text-primary, #111)' }}>{loginGateFeature}</strong> is a workspace feature.
            </p>
            <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '1.8rem', fontSize: '0.9rem' }}>
              Please login or create a free account to access this feature.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#6b21a8)', color: '#fff',
                  border: 'none', borderRadius: '10px', padding: '0.75rem 1.8rem',
                  fontWeight: 700, fontSize: '1rem', cursor: 'pointer', flex: 1, minWidth: '120px'
                }}
                onClick={() => { setShowLoginGate(false); setActiveTab('Login'); }}
              >
                <LogIn size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Login
              </button>
              <button
                style={{
                  background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff',
                  border: 'none', borderRadius: '10px', padding: '0.75rem 1.8rem',
                  fontWeight: 700, fontSize: '1rem', cursor: 'pointer', flex: 1, minWidth: '120px'
                }}
                onClick={() => { setShowLoginGate(false); setActiveTab('Registration'); }}
              >
                <UserPlus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Register Free
              </button>
            </div>
            <button
              style={{
                marginTop: '1.2rem', background: 'transparent', border: 'none',
                color: 'var(--text-secondary, #888)', cursor: 'pointer', fontSize: '0.85rem'
              }}
              onClick={() => setShowLoginGate(false)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
