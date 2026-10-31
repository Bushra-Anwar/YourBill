import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, UsersRound, FileText, FilePenLine, CreditCard, ShoppingCart, Bell, Files, Package, Warehouse, BookOpen, Landmark, BarChart3, Sparkles, Settings, RefreshCw, ShieldCheck, Rocket, Menu as MenuIcon, X, Search, Crown, House, ReceiptText, Boxes, CircleDollarSign, Moon, Sun, SlidersHorizontal, Users, Building2, Printer, Receipt } from 'lucide-react';
import './MainDashboard.css';
import SubscriptionDemo from './SubscriptionDemo';
import POSBilling from './POSBilling';
import { invoiceApi, customerApi, productApi, adminApi } from '../api';
import { AuthContext } from '../context/AuthContextValue';
import ProfileSettings from './ProfileSettings';
import { hasFeatureAccess } from '../subscriptionAccess';

const dashboardIconMap = {
  dashboard: LayoutDashboard, CustomerManagement: UsersRound, InvoiceManagement: FileText,
  QuotationManagement: FilePenLine, PaymentManagement: CreditCard, EcommerceIntegration: ShoppingCart,
  NotificationsManagement: Bell, DocumentManagement: Files, ProductServiceManagement: Package,
  InventoryManagement: Warehouse, AccountingManagement: BookOpen, TaxManagement: Landmark,
  ReportsAnalytics: BarChart3, AIFeatures: Sparkles, AdminPanel: Settings,
  SubscriptionManagement: RefreshCw, UserManagement: ShieldCheck, AdvancedFeatures: Rocket, AdminShops: Building2
};
function DashboardNavIcon({ id }) {
  const Icon = dashboardIconMap[id] || CircleDollarSign;
  return <Icon size={18} strokeWidth={1.8} aria-hidden="true" />;
}

const MainDashboard = ({ setActiveTab, theme, toggleTheme }) => {
  const { user, logout } = React.useContext(AuthContext);
  const roleKey = String(user?.role || user?.userType || 'client').toLowerCase().replace(/[\s_-]/g, '');
  const isAdminRole = ['admin', 'administrator', 'superadmin', 'owner'].includes(roleKey);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile hamburger
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileMenuRef = useRef(null);
  const [trialClock, setTrialClock] = useState(0);
  const [billingMode, setBillingMode] = useState('standard'); // 'standard' or 'pos'
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printModalInvoice, setPrintModalInvoice] = useState(null);
  const [printFormat, setPrintFormat] = useState('standard'); // 'standard' | 'thermal'

  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [adminRenewalAlerts, setAdminRenewalAlerts] = useState([]);
  const [showLowStockAlerts, setShowLowStockAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yourbill-profile-preferences') || '{}').lowStockAlerts !== false; }
    catch { return true; }
  });

  useEffect(() => {
    const timer = window.setTimeout(loadDashboardData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAdminRole) return undefined;
    let mounted = true;
    const loadRenewals = () => adminApi.getShops().then(shops => {
      if (mounted) setAdminRenewalAlerts(shops.filter(shop => shop.renewalDueSoon));
    }).catch(() => { if (mounted) setAdminRenewalAlerts([]); });
    loadRenewals();
    const timer = window.setInterval(loadRenewals, 15 * 60 * 1000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [isAdminRole]);

  useEffect(() => {
    if (!showProfile) return undefined;
    const closeOutside = event => { if (!profileMenuRef.current?.contains(event.target)) setShowProfile(false); };
    const closeOnEscape = event => { if (event.key === 'Escape') setShowProfile(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showProfile]);

  useEffect(() => {
    if (!user?.trialEndsAt || user.subscriptionStatus !== 'trial') return undefined;
    const timer = window.setInterval(() => setTrialClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [user?.trialEndsAt, user?.subscriptionStatus]);

  useEffect(() => {
    const updatePreferences = () => {
      try { setShowLowStockAlerts(JSON.parse(localStorage.getItem('yourbill-profile-preferences') || '{}').lowStockAlerts !== false); }
      catch { setShowLowStockAlerts(true); }
    };
    window.addEventListener('yourbill-profile-preferences-changed', updatePreferences);
    return () => window.removeEventListener('yourbill-profile-preferences-changed', updatePreferences);
  }, []);

  async function loadDashboardData() {
    try {
      const [c, p, invoices] = await Promise.all([
        customerApi.getAll(),
        productApi.getAll(),
        invoiceApi.getAll()
      ]);
      if (c) setCustomersList(c);
      if (p) setProductsList(p);
      if (invoices) setInvoicesList(invoices);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const dashboardNotifications = [
    ...adminRenewalAlerts.map(shop => ({
      key: `subscription-expiry-${shop._id}`,
      title: `${shop.companyName} subscription expiring`,
      detail: `${shop.subscriptionStatus === 'trial' ? 'Trial' : shop.plan} ends ${shop.daysUntilExpiry === 0 ? 'today' : `in ${shop.daysUntilExpiry} day${shop.daysUntilExpiry === 1 ? '' : 's'}`}. ${shop.email}`
    })),
    ...(() => {
      const end = user?.trialEndsAt ? new Date(user.trialEndsAt).getTime() : NaN;
      const remaining = end - trialClock;
      if (user?.subscriptionStatus !== 'trial' || !Number.isFinite(end) || remaining <= 0) return [];
      if (remaining <= 24 * 60 * 60 * 1000) return [{ key: 'trial-24-hour-warning', title: 'Free trial ends in 1 day', detail: `Your ${user.plan || 'Professional'} trial ends ${new Date(end).toLocaleString()}. Choose a plan to keep using your workspace.` }];
      if (remaining <= 48 * 60 * 60 * 1000) return [{ key: 'trial-48-hour-warning', title: 'Free trial ends in 2 days', detail: `Your ${user.plan || 'Professional'} trial ends ${new Date(end).toLocaleString()}. Review plans before access ends.` }];
      return [];
    })(),
    ...invoicesList.filter(invoice => invoice.status !== 'Paid').map(invoice => ({
      key: invoice._id,
      title: 'Payment pending',
      detail: `${invoice.invoiceNumber || 'Invoice'} · ${invoice.customerName || 'Customer'}`
    })),
    ...(showLowStockAlerts ? productsList.filter(product => product.type === 'Physical Product' && Number(product.stock) <= Number(product.minStock ?? 5)).map(product => ({
      key: product._id,
      title: 'Low stock',
      detail: `${product.name} · ${Number(product.stock) || 0} left`
    })) : [])
  ];

  const menuCategories = [
    {
      section: "Main Overview", items: [
        { id: 'dashboard', category: "Home", icon: "📊", isInternal: true }
      ]
    },
    {
      section: "1. Buyer Operations", items: [
        { id: 'CustomerManagement', category: "Buyers", icon: "👥" },
        { id: 'InvoiceManagement', category: "Invoice", icon: "📄" },
        { id: 'QuotationManagement', category: "Quotes", icon: "📝" },
        { id: 'PaymentManagement', category: "Payments", icon: "💳" },
        { id: 'EcommerceIntegration', category: "E-commerce", icon: "🛒" },
        { id: 'NotificationsManagement', category: "Alerts", icon: "🔔" },
        { id: 'DocumentManagement', category: "Print/PDF", icon: "📑" }
      ]
    },
    {
      section: "2. Seller (Client) Shortcuts", items: [
        { id: 'ProductServiceManagement', category: "Product & Services", icon: "📦" },
        { id: 'InventoryManagement', category: "Inventory & Stock", icon: "🏢" },
        { id: 'AccountingManagement', category: "Accounts & Ledger", icon: "📘" },
        { id: 'TaxManagement', category: "GST & Taxes", icon: "🏛️" },
        { id: 'ReportsAnalytics', category: "Business Analytics", icon: "📊" },
        { id: 'AIFeatures', category: "AI Insights", icon: "✨" }
      ]
    },
    {
      section: "3. Admin Capabilities", items: [
        { id: 'AdminShops', category: "All Shops & Data", icon: "🏬" },
        { id: 'AdminPanel', category: "Platform Settings", icon: "⚙️" },
        { id: 'SubscriptionManagement', category: "Client Subscriptions", icon: "🔄" },
        { id: 'UserManagement', category: "Admin Roles & Access", icon: "🔐" },
        { id: 'AdvancedFeatures', category: "Advanced SaaS Controls", icon: "🚀" }
      ]
    }
  ];

  const handleMenuClick = (item) => {
    if (item.isInternal) {
      setActiveMenu(item.id);
      setIsSidebarOpen(false);
    } else {
      setActiveTab(item.id);
    }
  };

  // Billing Form State
  const [invoiceItems, setInvoiceItems] = useState([
    { id: 1, name: '', qty: 1, price: 0, tax: 0, total: 0 }
  ]);

  const handleItemChange = (id, field, value) => {
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Calculate total for this row
        const qty = parseFloat(updated.qty) || 0;
        const price = parseFloat(updated.price) || 0;
        const tax = parseFloat(updated.tax) || 0;
        updated.total = (qty * price) + ((qty * price * tax) / 100);
        return updated;
      }
      return item;
    }));
  };

  const addItemRow = () => {
    const newId = invoiceItems.length > 0 ? invoiceItems[invoiceItems.length - 1].id + 1 : 1;
    setInvoiceItems([...invoiceItems, { id: newId, name: '', qty: 1, price: 0, tax: 0, total: 0 }]);
  };

  const subtotal = invoiceItems.filter(item => item.name.trim()).reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)), 0);
  const taxTotal = invoiceItems.filter(item => item.name.trim()).reduce((sum, item) => sum + (((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0) * (parseFloat(item.tax) || 0)) / 100), 0);

  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const discountAmount = parseFloat(discount) || 0;
  const grandTotal = subtotal + taxTotal - discountAmount;

  const startNewInvoice = () => {
    setBillingMode('standard');
    setCustomerName('');
    setPhoneNumber('');
    setGstin('');
    setInvoiceItems([{ id: 1, name: '', qty: 1, price: 0, tax: 0, total: 0 }]);
    setDiscount(0);
    setNotes('');
    setActiveMenu('sale-invoice');
  };

  const getCompanyDetails = () => {
    let stored = null;
    try {
      const raw = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('companyProfile');
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }

    const combined = { ...stored, ...user };

    return {
      companyName: combined?.companyName || combined?.shopName || combined?.businessName || combined?.name || 'Ravi kumar',
      ownerName: combined?.name || combined?.ownerName || 'Ravi kumar',
      phone: combined?.phone || '9508399874',
      email: combined?.email || 'ravikumar124dubey@gmail.com',
      address: combined?.address || [combined?.city, combined?.state, combined?.pincode].filter(Boolean).join(', ') || 'Gaur City 2, Ghaziabaad , UP',
      city: combined?.city || 'Ghaziabad',
      state: combined?.state || 'UP',
      pincode: combined?.pincode || '',
      gstin: combined?.gstin || '',
      tagline: combined?.tagline || 'Best From Best',
      bankDetails: {
        accountHolder: combined?.bankDetails?.accountHolder || combined?.bankAccountHolder || combined?.name || 'Rahul',
        accountNumber: combined?.bankDetails?.accountNumber || combined?.accountNumber || '12345678910',
        bankName: combined?.bankDetails?.bankName || combined?.bankName || 'Axis',
        branch: combined?.bankDetails?.branch || combined?.branch || 'Delhi',
        ifsc: combined?.bankDetails?.ifsc || combined?.ifsc || 'Axis00',
        upiId: combined?.bankDetails?.upiId || combined?.upiId || (combined?.phone ? `${combined.phone}@upi` : '1234567890@upi')
      }
    };
  };

  const formatInvoiceDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    const day = d.getDate();
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hourStr = String(hours).padStart(2, '0');
    return `${day} ${month}, ${year} ${hourStr}:${minutes} ${ampm}`;
  };

  const formatThermalDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date: `${dd}/${mm}/${yyyy}`, time };
  };

  const numberToWordsIndian = (num) => {
    const nNum = Math.round(Number(num) || 0);
    if (nNum <= 0) return 'Zero Rupees Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const n = ('000000000' + nNum).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return `${nNum} Rupees Only`;
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() ? str.trim() + ' Rupees Only' : 'Zero Rupees Only';
  };

  const getUPIQrUrl = (upiId, compName, amount, billNo) => {
    const upiIntent = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(compName)}&am=${Number(amount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + billNo)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiIntent)}`;
  };

  const handleSaveAndPrint = async () => {
    const cleanCustomerName = customerName.trim();
    if (!cleanCustomerName) {
      alert('Please enter a customer name.');
      return;
    }
    const invoiceLines = invoiceItems.filter(item => item.name.trim());
    if (!invoiceLines.length || invoiceLines.some(item => Number(item.qty) <= 0 || Number(item.price) < 0)) {
      alert('Please add valid items to the invoice.');
      return;
    }
    if (discountAmount < 0 || discountAmount > subtotal + taxTotal) {
      alert('Discount must be between ₹0 and the invoice total.');
      return;
    }
    if (grandTotal <= 0) {
      alert('Invoice total must be greater than ₹0.');
      return;
    }

    const matchedCustomer = customersList.find(customer =>
      String(customer.name || '').trim().toLowerCase() === cleanCustomerName.toLowerCase()
    );

    const payload = {
      customerId: matchedCustomer?._id || matchedCustomer?.customerId,
      customerName: cleanCustomerName,
      customerPhone: phoneNumber.trim(),
      customerGstin: gstin.trim(),
      date: new Date(),
      type: 'Sale Invoice',
      items: invoiceLines.map(item => {
        const product = productsList.find(entry => String(entry.name || '').trim().toLowerCase() === item.name.trim().toLowerCase());
        return {
        productId: product?._id || product?.productId,
        name: item.name,
        quantity: Number(item.qty),
        qty: parseFloat(item.qty),
        rate: parseFloat(item.price),
        tax: parseFloat(item.tax),
        amount: item.total
      }; }),
      subtotal,
      totalTax: taxTotal,
      discount: discountAmount,
      totalAmount: grandTotal,
      grandTotal,
      paidAmount: 0,
      status: 'Unpaid',
      notes: notes
    };

    try {
      const saved = await invoiceApi.create(payload);
      setPrintModalInvoice(saved);
      setShowPrintModal(true);
      setCustomerName('');
      setPhoneNumber('');
      setGstin('');
      setInvoiceItems([{ id: 1, name: '', qty: 1, price: 0, tax: 0, total: 0 }]);
      setDiscount(0);
      setNotes('');
      await loadDashboardData();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert(`Error saving to database: ${error.message}`);
    }
  };

  const handleWhatsAppShare = () => {
    if (!customerName || grandTotal <= 0) {
      alert('Please fill out the invoice first.');
      return;
    }
    let text = `*SALE INVOICE*\nCustomer: ${customerName}\nDate: ${new Date().toLocaleDateString()}\n\n*Items:*\n`;
    invoiceItems.forEach((item, idx) => {
      if (item.name) {
        text += `${idx + 1}. ${item.name} - Qty: ${item.qty} - ₹${item.total.toFixed(2)}\n`;
      }
    });
    text += `\n*Subtotal:* ₹${subtotal.toFixed(2)}\n*Tax:* ₹${taxTotal.toFixed(2)}\n*Discount:* ₹${discountAmount.toFixed(2)}\n\n*GRAND TOTAL: ₹${grandTotal.toFixed(2)}*\n\nThank you for your business!`;

    const encodedText = encodeURIComponent(text);
    const waUrl = phoneNumber ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="main-dashboard-layout">
      {/* Hamburger Overlay */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Left Sidebar Navigation Menu */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="rainbow-text logo" onClick={() => setActiveTab('Explore')} style={{ cursor: 'pointer' }}>YourBill</span>
          <button className="close-sidebar-btn" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)}><X size={19} /></button>
        </div>
        <div className="sidebar-menu">
          {menuCategories.filter(group => isAdminRole || group.items.some(item => !['AdminPanel', 'SubscriptionManagement', 'AdminShops'].includes(item.id) && hasFeatureAccess(user, item.id))).map((group, index) => (
            <div key={index} className="menu-section">
              <div className="menu-section-title">{!isAdminRole && group.section === '3. Admin Capabilities' ? '3. Enterprise Workspace' : group.section}</div>
              {group.items.filter(item => (isAdminRole || !['AdminPanel', 'SubscriptionManagement', 'AdminShops'].includes(item.id)) && hasFeatureAccess(user, item.id)).map((item) => (
                <div
                  key={item.id}
                  className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item)}
                >
                  <span className="icon"><DashboardNavIcon id={item.id} /></span> {item.category}
                </div>
              ))}
            </div>
          ))}
          <div className="menu-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <div className="menu-item" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center' }}>
              <span className="icon">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</span>
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content-area">
        {/* Main Top Header Bar */}
        <header className="top-header">
          <div className="header-left">
            <div className="company-branding">
              <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
                <MenuIcon size={21} aria-hidden="true" />
              </button>
              <span className="logo-icon"><House size={18} aria-hidden="true" /></span>
              <span className="company-select" title={user?.companyName || user?.shopName || 'Your Business'}>{user?.companyName || user?.shopName || 'Your Business'}</span>
              <button
                className="header-btn"
                onClick={() => setActiveTab('Home')}
                style={{ marginLeft: '10px', background: 'transparent', border: '1px solid var(--glass-border)', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <House size={15} aria-hidden="true" /> Main Site
              </button>
            </div>
          </div>
          <div className="header-center">
            <div className="search-bar-container">
              <span className="search-icon"><Search size={16} aria-hidden="true" /></span>
              <input type="text" placeholder="Search Parties, Items, Invoices..." className="universal-search" />
            </div>
          </div>
          <div className="header-right">
            <button className="upgrade-btn header-btn" onClick={() => isAdminRole ? setActiveTab('SubscriptionManagement') : setActiveMenu('subscription-demo')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(45deg, #FFD700, #FDB931)', color: '#000', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
              <Crown size={16} aria-hidden="true" /> Subscription
            </button>
            <button className="create-new-btn rainbow-bg" onClick={startNewInvoice}>
              + Create New
            </button>
            <div className="header-actions">
              <div className="notification-wrapper">
                <div className="notification-bell header-btn" onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell size={19} aria-hidden="true" /> {dashboardNotifications.length > 0 && <span className="badge">{dashboardNotifications.length}</span>}
                </div>
                {showNotifications && (
                  <div className="dropdown-menu fade-in">
                    <div className="dropdown-header">Notifications</div>
                    {dashboardNotifications.length ? dashboardNotifications.slice(0, 6).map(notification => (
                      <div className="dropdown-item" key={notification.key} onClick={() => String(notification.key).startsWith('subscription-expiry-') && setActiveTab('AdminShops')}><strong>{notification.title}:</strong> {notification.detail}</div>
                    )) : <div className="dropdown-item">You’re all caught up.</div>}
                  </div>
                )}
              </div>

              <div className="profile-wrapper" ref={profileMenuRef} onMouseLeave={() => setShowProfile(false)}>
                <button type="button" className="profile-avatar" aria-label="Open profile menu" aria-expanded={showProfile} title={user?.name || user?.email || 'Profile'} onClick={() => setShowProfile(open => !open)}>{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</button>
                {showProfile && (
                  <div className="dropdown-menu profile-role-menu fade-in" style={{ right: 0 }}>
                    <div className="dropdown-header"><strong>{user?.name || user?.email || 'My Profile'}</strong>{user?.email && <small style={{ display: 'block', marginTop: '.25rem', fontWeight: 400 }}>{user.email}</small>}{user?.companyName && <small style={{ display: 'block', marginTop: '.15rem', fontWeight: 400 }}>{user.companyName}</small>}</div>
                    {isAdminRole ? (
                      <>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('AdminPanel'); }}><Settings size={15} /> Admin Console</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('UserManagement'); }}><Users size={15} /> Team & Access</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('SubscriptionManagement'); }}><Crown size={15} /> Client Subscriptions</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('AdminShops'); }}><Building2 size={15} /> All Shops & Data</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('ReportsAnalytics'); }}><BarChart3 size={15} /> Platform Reports</div>
                      </>
                    ) : (
                      <>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('InvoiceManagement'); }}><ReceiptText size={15} /> My Invoices</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('ProductServiceManagement'); }}><Boxes size={15} /> Products & Stock</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('ReportsAnalytics'); }}><BarChart3 size={15} /> Business Reports</div>
                        <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveMenu('subscription-demo'); }}><Crown size={15} /> My Billing Plan</div>
                      </>
                    )}
                    {user?.subscriptionStatus === 'trial' && user?.trialEndsAt && <div className="dropdown-item" style={{ cursor: 'default' }}><Crown size={15} /> Trial ends {new Date(user.trialEndsAt).toLocaleDateString()}</div>}
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveMenu('profile-settings'); }}><SlidersHorizontal size={15} /> Profile & Settings</div>
                    <div className="dropdown-divider"></div>
                    {user && <div className="dropdown-item text-red" onClick={() => { logout(); setActiveTab('Home'); }}>Log Out</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="dynamic-content fade-in">
          {activeMenu === 'profile-settings' && <ProfileSettings onBack={() => setActiveMenu('dashboard')} theme={theme} toggleTheme={toggleTheme} />}
          {activeMenu === 'dashboard' && (
            <div className="dashboard-content dropship-style">

              <div className="hero-section text-center">
                <span className="hero-badge">⚡ Next-Gen Billing SaaS is live!</span>
                <h1 className="hero-title">
                  Discover intelligent <br />
                  <span className="gradient-text">workflows</span> to scale your business
                </h1>
                <p className="hero-subtitle">
                  Streamline operations, manage inventory, and gain real-time insights into your revenue, sales, and customers in one unified platform.
                </p>
                <div className="hero-actions">
                  <button className="btn-primary rainbow-bg pulse-btn" onClick={startNewInvoice}>Start Billing</button>
                  <button className="btn-secondary glass-btn" onClick={() => setActiveTab('ReportsAnalytics')}>View Reports</button>
                </div>
              </div>


              <div className="floating-modules-container">
                <img src="/hero_billing.png" alt="Billing Software Hero" className="center-hero-img" />

                <div className="floating-card pos-2" onClick={() => setActiveTab('ProductServiceManagement')}>
                  <div className="fc-icon theme-icon">📦</div>
                  <div className="fc-info">
                    <strong>Products</strong>
                    <span>Manage Catalog</span>
                  </div>
                </div>

                <div className="floating-card pos-3" onClick={() => setActiveTab('InventoryManagement')}>
                  <div className="fc-icon theme-icon">🏢</div>
                  <div className="fc-info">
                    <strong>Inventory</strong>
                    <span>Stock & Tracking</span>
                  </div>
                </div>

                <div className="floating-card pos-4" onClick={() => setActiveTab('CustomerManagement')}>
                  <div className="fc-icon theme-icon">👥</div>
                  <div className="fc-info">
                    <strong>Customers</strong>
                    <span>Client Profiles</span>
                  </div>
                </div>

                <div className="floating-card pos-5 featured-float" onClick={startNewInvoice}>
                  <div className="fc-icon theme-icon">🧾</div>
                  <div className="fc-info">
                    <strong>Billing / POS</strong>
                    <span>Fast Checkout</span>
                  </div>
                </div>

                <div className="floating-card pos-6" onClick={() => setActiveTab('PaymentManagement')}>
                  <div className="fc-icon theme-icon">💳</div>
                  <div className="fc-info">
                    <strong>Payments</strong>
                    <span>Receivables</span>
                  </div>
                </div>

                <div className="floating-card pos-7" onClick={() => setActiveTab('ReportsAnalytics')}>
                  <div className="fc-icon theme-icon">📈</div>
                  <div className="fc-info">
                    <strong>Sales History</strong>
                    <span>Past Transactions</span>
                  </div>
                </div>

                <div className="floating-card pos-8" onClick={() => setActiveTab('ReportsAnalytics')}>
                  <div className="fc-icon theme-icon">📊</div>
                  <div className="fc-info">
                    <strong>Reports</strong>
                    <span>Tax & Growth</span>
                  </div>
                </div>

                <div className="floating-card pos-9" onClick={() => setActiveTab('AccountingManagement')}>
                  <div className="fc-icon theme-icon">💸</div>
                  <div className="fc-info">
                    <strong>Expenses</strong>
                    <span>Cost Management</span>
                  </div>
                </div>

                <div className="floating-card pos-10" onClick={() => isAdminRole ? setActiveTab('AdminPanel') : setActiveMenu('profile-settings')}>
                  <div className="fc-icon theme-icon">⚙️</div>
                  <div className="fc-info">
                    <strong>Settings</strong>
                    <span>App Configuration</span>
                  </div>
                </div>

              </div>

              {/* 3D Isometric Priority Workflow Section */}
              <div className="priority-workflow-container">
                <h3 className="workflow-title">Priority Setup <span className="gradient-text">Workflow</span></h3>

                <div className="workflow-3d-wrapper">
                  <div className="workflow-bg-line">
                    <div className="bg-diamond" style={{ left: '12%' }}></div>
                    <div className="bg-diamond" style={{ left: '37%' }}></div>
                    <div className="bg-diamond" style={{ left: '62%' }}></div>
                  </div>

                  <div className="workflow-nodes-3d">

                    <div className="w-node-3d" onClick={() => setActiveTab('CustomerManagement')}>
                      <div className="node-platform-3d"></div>
                      <div className="node-content-3d">
                        <div className="node-number-badge">1</div>
                        <div className="node-icon-img">👥</div>
                        <div className="node-label-3d">Add Parties</div>
                      </div>
                    </div>

                    <div className="w-node-3d" onClick={() => setActiveTab('ProductServiceManagement')}>
                      <div className="node-platform-3d"></div>
                      <div className="node-content-3d">
                        <div className="node-number-badge">2</div>
                        <div className="node-icon-img">📦</div>
                        <div className="node-label-3d">Add Items</div>
                      </div>
                    </div>

                    <div className="w-node-3d" onClick={startNewInvoice}>
                      <div className="node-platform-3d"></div>
                      <div className="node-content-3d">
                        <div className="node-number-badge">3</div>
                        <div className="node-icon-img">🧾</div>
                        <div className="node-label-3d">Create Invoice</div>
                      </div>
                    </div>

                    <div className="w-node-3d" onClick={() => setActiveTab('PaymentManagement')}>
                      <div className="node-platform-3d"></div>
                      <div className="node-content-3d">
                        <div className="node-number-badge">4</div>
                        <div className="node-icon-img">💳</div>
                        <div className="node-label-3d">Collect Payment</div>
                      </div>
                    </div>

                  </div>
                </div>

                <button className="workflow-explore-btn pulse-btn rainbow-bg" onClick={() => isAdminRole ? setActiveTab('AdminPanel') : setActiveTab('ReportsAnalytics')}>EXPLORE THE MENU.</button>
              </div>

            </div>
          )}

          {activeMenu === 'sale-invoice' && billingMode === 'standard' && (
            <div className={`billing-screen-content fade-in ${showPrintModal ? 'no-print' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button className="back-btn" onClick={() => setActiveMenu('dashboard')} style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ← Back to Dashboard
                </button>
                <button className="upgrade-btn rainbow-bg" onClick={() => setBillingMode('pos')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', border: 'none', color: '#fff', fontWeight: 'bold' }}>
                  Switch to POS Mode ⚡
                </button>
              </div>
              <div className="billing-header">
                <h2>Create Sale Invoice</h2>
                <span className="invoice-date">Date: {new Date().toLocaleDateString('en-IN')}</span>
              </div>

              {/* Party Details Section */}
              <div className="party-details-section panel">
                <h3>Party Details</h3>
                <div className="form-row">
                  <div className="input-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      list="dashboard-customers"
                      value={customerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerName(val);
                        const found = customersList.find(c => c.name.toLowerCase() === val.toLowerCase());
                        if (found) {
                          setPhoneNumber(found.phone || '');
                          setGstin(found.gst || '');
                        }
                      }}
                      placeholder="Type or select Customer..."
                      className="autocomplete-combobox"
                      style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)' }}
                    />
                    <datalist id="dashboard-customers">
                      {customersList.map(c => (
                        <option key={c._id || c.customerId} value={c.name}>{c.phone}</option>
                      ))}
                    </datalist>
                  </div>
                  <div className="input-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 9876543210"
                      style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div className="input-group">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="Enter GST Number"
                      style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Itemized Dynamic Table */}
              <div className="itemized-table-section panel">
                <h3>Invoice Items</h3>
                <div className="table-responsive">
                  <table className="billing-table">
                    <thead>
                      <tr>
                        <th>S.No.</th>
                        <th style={{ width: '35%' }}>Item Name</th>
                        <th>Quantity</th>
                        <th>Unit Price (₹)</th>
                        <th>Tax (%)</th>
                        <th>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>
                            <input
                              type="text"
                              list="dashboard-products"
                              placeholder="Type or select Item Name..."
                              value={item.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemChange(item.id, 'name', val);
                                const found = productsList.find(p => p.name.toLowerCase() === val.toLowerCase());
                                if (found) {
                                  let taxNum = 18;
                                  if (found.taxRate) {
                                    const parsed = parseFloat(String(found.taxRate).replace(/[^0-9.]/g, ''));
                                    if (!isNaN(parsed)) taxNum = parsed;
                                  }
                                  handleItemChange(item.id, 'price', found.price || 0);
                                  handleItemChange(item.id, 'tax', taxNum);
                                }
                              }}
                              className="item-select"
                              style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                            />
                            <datalist id="dashboard-products">
                              {productsList.map(p => (
                                <option key={p._id || p.productId} value={p.name}>₹{p.price}</option>
                              ))}
                            </datalist>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                              className="qty-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                              className="price-input"
                            />
                          </td>
                          <td>
                            <select
                              value={item.tax}
                              onChange={(e) => handleItemChange(item.id, 'tax', e.target.value)}
                              className="tax-select"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="row-total">₹ {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="add-row-btn" onClick={addItemRow}>+ Add Row</button>
              </div>

              {/* Total Billing Summary & Checkout */}
              <div className="billing-footer">
                <div className="billing-notes">
                  <label>Notes / Terms</label>
                  <textarea
                    placeholder="Enter terms and conditions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
                <div className="billing-summary panel">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>₹ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax (GST):</span>
                    <span>₹ {taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row discount-row">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="discount-input"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                  <div className="summary-row grand-total">
                    <span>Grand Total:</span>
                    <span>₹ {grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="checkout-actions">
                    <button className="btn-primary rainbow-bg full-width" onClick={handleSaveAndPrint}>Save & Print</button>
                    <button className="whatsapp-share-btn full-width" onClick={handleWhatsAppShare} style={{ background: '#25D366', color: '#fff', border: 'none' }}>Share on WhatsApp</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'sale-invoice' && billingMode === 'pos' && (
            <POSBilling onBack={() => setBillingMode('standard')} />
          )}

          {activeMenu === 'subscription-demo' && (
            <SubscriptionDemo onBack={() => setActiveMenu('dashboard')} onLogin={() => setActiveTab('Login')} onRegister={() => setActiveTab('Registration')} />
          )}

          {(activeMenu !== 'dashboard' && activeMenu !== 'sale-invoice' && activeMenu !== 'subscription-demo') && (
            <div className="placeholder-content fade-in">
              <h2>{activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1).replace('-', ' ')}</h2>
              <p>This module is under construction.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav mobile-only">
        <div className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('dashboard')}>
          <span className="icon"><LayoutDashboard size={18} /></span>
          <span>Home</span>
        </div>
        <div className={`nav-item ${activeMenu === 'parties' ? 'active' : ''}`} onClick={() => setActiveMenu('parties')}>
          <span className="icon"><UsersRound size={18} /></span>
          <span>Parties</span>
        </div>
        <div className="nav-item action-btn" onClick={startNewInvoice}>
          <div className="floating-btn rainbow-bg">+</div>
          <span>Sale</span>
        </div>
        <div className={`nav-item ${activeMenu === 'items' ? 'active' : ''}`} onClick={() => setActiveMenu('items')}>
          <span className="icon"><Package size={18} /></span>
          <span>Items</span>
        </div>
        <div className={`nav-item ${activeMenu === 'settings' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(true)}>
          <span className="icon"><MenuIcon size={18} /></span>
          <span>Menu</span>
        </div>
      </div>

      {/* Invoice Print & Preview Modal */}
      {showPrintModal && printModalInvoice && (() => {
        const company = getCompanyDetails();
        const inv = printModalInvoice;
        const invId = inv.invoiceNumber || inv.id || '62';
        const custName = inv.customerName || 'Customer';
        const custPhone = inv.customerPhone || '';
        const custGstin = inv.customerGstin || '';
        const formattedInvDate = formatInvoiceDate(inv.date);
        const thDate = formatThermalDate(inv.date);
        const invItems = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [];
        const totalQty = invItems.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
        const sub = Number(inv.subtotal || 0);
        const totalTax = Number(inv.totalTax || 0);
        const cgst = totalTax / 2;
        const sgst = totalTax / 2;
        const totalAmt = Number(inv.grandTotal || inv.totalAmount || 0);
        const discountAmt = Number(inv.discount || 0);
        const receivedAmt = Number(inv.paidAmount || 0);
        const balance = Math.max(0, totalAmt - receivedAmt);

        return (
          <div className="print-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, overflowY: 'auto', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div className="print-modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '860px', width: '100%', position: 'relative' }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div className="bill-format-toggle">
                  <button
                    type="button"
                    className={`bill-format-btn ${printFormat === 'standard' ? 'active' : ''}`}
                    onClick={() => setPrintFormat('standard')}
                  >
                    <FileText size={15} /> 📄 Tax Invoice (A4)
                  </button>
                  <button
                    type="button"
                    className={`bill-format-btn ${printFormat === 'thermal' ? 'active' : ''}`}
                    onClick={() => setPrintFormat('thermal')}
                  >
                    <Receipt size={15} /> 🧾 Thermal Slip (POS)
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => window.print()}
                  >
                    <Printer size={16} /> 🖨️ Print Now
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                    onClick={() => setShowPrintModal(false)}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {printFormat === 'thermal' ? (
                /* Thermal Receipt (Image 2) */
                <div className="thermal-receipt-container">
                  <div className="th-header">
                    <div className="th-logo-square">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                    </div>
                    <div className="th-company-title">{company.companyName}</div>
                    <div className="th-address-line">{company.address}</div>
                    <div className="th-tagline">{company.tagline}</div>
                    <div className="th-phone-line">{company.phone}</div>
                    <div className="th-email-line">Email - {company.email}</div>
                  </div>

                  <hr className="th-dashed-separator" />

                  <table className="th-meta-table">
                    <tbody>
                      <tr><td className="th-meta-label">Bill No #:</td><td className="th-meta-val">{invId}</td></tr>
                      <tr><td className="th-meta-label">ITEM:</td><td className="th-meta-val">{invItems.map((_, i) => `ITEM110${i}`).join(', ') || 'ITEM1100'}</td></tr>
                      <tr><td className="th-meta-label">Date:</td><td className="th-meta-val">{thDate.date}</td></tr>
                      <tr><td className="th-meta-label">Time:</td><td className="th-meta-val">{thDate.time}</td></tr>
                      <tr><td className="th-meta-label">Customer Type:</td><td className="th-meta-val">RETAIL</td></tr>
                      <tr><td className="th-meta-label">Order Status:</td><td className="th-meta-val">COMPLETED</td></tr>
                      <tr><td className="th-meta-label">Payment Method:</td><td className="th-meta-val">CASH</td></tr>
                      <tr><td className="th-meta-label">Payment Status:</td><td className="th-meta-val">PAID</td></tr>
                      <tr><td className="th-meta-label">Staff Name:</td><td className="th-meta-val">OWNER</td></tr>
                      <tr><td className="th-meta-label">Created By:</td><td className="th-meta-val">{company.ownerName.toUpperCase()}</td></tr>
                    </tbody>
                  </table>

                  <div className="th-billing-heading">Billing To</div>
                  <table className="th-meta-table">
                    <tbody>
                      <tr><td className="th-meta-label">Name:</td><td className="th-meta-val">{custName}</td></tr>
                      <tr><td className="th-meta-label">Contact No.:</td><td className="th-meta-val">{custPhone || '9999999999'}</td></tr>
                      <tr><td className="th-meta-label">GSTIN.:</td><td className="th-meta-val">{custGstin || company.gstin || 'GSTIN859612356'}</td></tr>
                    </tbody>
                  </table>

                  <hr className="th-dashed-separator" />

                  <table className="th-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45%' }}>Items</th>
                        <th className="th-center" style={{ width: '18%' }}>Qty</th>
                        <th className="th-right" style={{ width: '17%' }}>Price</th>
                        <th className="th-right" style={{ width: '20%' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invItems.map((it, idx) => {
                        const qty = Number(it.qty || it.quantity) || 1;
                        const rate = Number(it.rate || it.price) || 0;
                        const taxRate = Number(it.taxRate !== undefined ? it.taxRate : (it.tax !== undefined ? it.tax : 0));
                        const mrp = Number(it.mrp || Math.round(rate * 1.1) || rate);
                        const itemAmt = Number(it.amount || (qty * rate) + (qty * rate * taxRate / 100));

                        return (
                          <tr key={idx} className="th-item-main-row">
                            <td>
                              <div className="th-item-name">{it.name}</div>
                              <div className="th-item-sub-detail">MRP ₹{mrp}</div>
                              <div className="th-item-sub-detail">GST: {taxRate}%</div>
                            </td>
                            <td className="th-center" style={{ verticalAlign: 'middle' }}>{qty} {it.unit || 'Piece'}</td>
                            <td className="th-right" style={{ verticalAlign: 'middle' }}>{rate}</td>
                            <td className="th-right" style={{ verticalAlign: 'middle', fontWeight: 'bold' }}>{itemAmt.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <hr className="th-dashed-separator" />

                  <table className="th-totals-table">
                    <tbody>
                      <tr><td>Item Total:</td><td className="th-val">₹{Math.round(sub)}</td></tr>
                      {discountAmt > 0 && <tr><td>Bill Discount:</td><td className="th-val">- ₹{discountAmt.toFixed(2)}</td></tr>}
                      <tr><td>Subtotal:</td><td className="th-val">₹{(sub - discountAmt).toFixed(2)}</td></tr>
                      <tr><td>CGST:</td><td className="th-val">₹{cgst.toFixed(2)}</td></tr>
                      <tr><td>SGST:</td><td className="th-val">₹{sgst.toFixed(2)}</td></tr>
                      <tr className="th-grand-total-row"><td>Grand Total:</td><td className="th-val">₹{Math.round(totalAmt)}</td></tr>
                    </tbody>
                  </table>

                  <hr className="th-dashed-separator" />

                  <div className="th-words-section">
                    <div className="th-words-label">Amount in Words</div>
                    <div className="th-words-text">{numberToWordsIndian(totalAmt)}</div>
                  </div>

                  <div className="th-qr-section">
                    <img src={getUPIQrUrl(company.bankDetails.upiId, company.companyName, totalAmt, invId)} alt="UPI QR" className="th-qr-image" />
                    <div className="th-upi-logo-row">
                      <span>UPI</span>
                      <span className="th-upi-arrows"><span className="th-upi-green">▶</span><span className="th-upi-orange">▶</span></span>
                    </div>
                    <div className="th-scan-btn">SCAN TO PAY</div>
                  </div>

                  <hr className="th-dashed-separator" />

                  <div className="th-tc-section">
                    <div className="th-tc-heading">T &amp; C</div>
                    <div className="th-tc-line">1. Goods once sold will not be taken back or exchanged.</div>
                    <div className="th-tc-line">2. All disputes are subject to jurisdiction only.</div>
                  </div>

                  <hr className="th-dashed-separator" />

                  <div className="th-footer-section">
                    <div className="th-powered-by">Powered by <strong>{company.companyName}</strong></div>
                    <div className="th-grow-line">Grow with {company.companyName}!</div>
                    <div className="th-maroon-banner-1">Thank You, Visit Again.</div>
                    <div className="th-maroon-banner-2">Feels Best</div>
                  </div>
                </div>
              ) : (
                /* Standard Tax Invoice (Image 1) */
                <div className="standard-inv-container">
                  <div className="standard-inv-watermark-top">ORIGINAL FOR RECIPIENT</div>

                  <div className="standard-inv-box">
                    <div className="std-header-section">
                      <h1 className="std-company-name">{company.companyName}</h1>
                      <div className="std-header-text">Phone: {company.phone}</div>
                      <div className="std-header-text">Email: {company.email}</div>
                      {company.gstin && <div className="std-header-text">GSTIN: {company.gstin}</div>}
                    </div>

                    <div className="std-meta-row">
                      <div className="std-meta-col-left">
                        <div className="std-section-title">BILL TO</div>
                        <div className="std-meta-line" style={{ fontWeight: 600 }}>{custName}</div>
                        <div className="std-meta-line">Phone: {custPhone || '5846984584'}</div>
                        {custGstin && <div className="std-meta-line">GSTIN: {custGstin}</div>}
                      </div>
                      <div className="std-meta-col-right">
                        <div className="std-meta-line"><strong>Invoice No:</strong> {invId}</div>
                        <div className="std-meta-line"><strong>Invoice Date:</strong> {formattedInvDate}</div>
                      </div>
                    </div>

                    <table className="std-table">
                      <thead>
                        <tr>
                          <th style={{ width: '4%', textAlign: 'center' }}>#</th>
                          <th style={{ width: '28%', textAlign: 'left' }}>Items</th>
                          <th style={{ width: '8%', textAlign: 'center' }}>HSN</th>
                          <th style={{ width: '12%', textAlign: 'left' }}>Quantity</th>
                          <th style={{ width: '11%', textAlign: 'left' }}>MRP</th>
                          <th style={{ width: '14%', textAlign: 'left' }}>Rate Per Unit</th>
                          <th style={{ width: '11%', textAlign: 'left' }}>Tax Per Unit</th>
                          <th style={{ width: '12%', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invItems.map((it, idx) => {
                          const qty = Number(it.qty || it.quantity) || 1;
                          const rate = Number(it.rate || it.price) || 0;
                          const taxRate = Number(it.taxRate !== undefined ? it.taxRate : (it.tax !== undefined ? it.tax : 3));
                          const mrp = Number(it.mrp || (rate > 0 ? Math.round(rate) : 0));
                          const taxPerUnit = (rate * taxRate) / 100;
                          const rowAmt = Number(it.amount || (qty * rate) + (qty * taxPerUnit));
                          const unit = it.unit || 'Piece';

                          return (
                            <tr key={idx}>
                              <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                              <td>
                                <div className="std-item-cell">
                                  <div className="std-item-thumb-placeholder">📷</div>
                                  <span className="std-item-name">{it.name}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>{it.hsnCode || ''}</td>
                              <td>{qty} {unit}</td>
                              <td>₹{mrp > 0 ? mrp : rate}</td>
                              <td>₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td>₹{taxPerUnit.toFixed(2)} ({taxRate})</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                ₹{rowAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="std-total-row">
                          <td colSpan={3} style={{ textAlign: 'right', borderRight: '1.5px solid #2d3748' }}>
                            <strong>Total</strong>
                          </td>
                          <td style={{ borderRight: '1.5px solid #2d3748' }}>
                            <strong>{totalQty.toFixed(2)}</strong>
                          </td>
                          <td style={{ borderRight: '1.5px solid #2d3748' }}></td>
                          <td style={{ borderRight: '1.5px solid #2d3748' }}></td>
                          <td style={{ borderRight: '1.5px solid #2d3748' }}></td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="std-received-row">
                      <div className="std-received-left">
                        Received Amount: ₹{receivedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="std-received-right">
                        Balance: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="std-remark-row">
                      <strong>Remark:</strong> {inv.notes || ''}
                    </div>

                    <div className="std-bottom-row">
                      <div className="std-terms-col">
                        <h4>Terms &amp; Conditions</h4>
                        <p>Term 1: Goods once sold will not be taken back or exchanged.</p>
                        <p>Term 2: Interest @18% p.a. will be charged if payment is not received within 15 days.</p>
                      </div>
                      <div className="std-bank-col">
                        <h4>Bank Details</h4>
                        <div className="std-bank-info-grid">
                          <div className="std-bank-lines">
                            <div><strong>Account holder:</strong> {company.bankDetails.accountHolder}</div>
                            <div><strong>Account number:</strong> {company.bankDetails.accountNumber}</div>
                            <div><strong>Bank:</strong> {company.bankDetails.bankName}</div>
                            <div><strong>Branch:</strong> {company.bankDetails.branch}</div>
                            <div><strong>IFSC code:</strong> {company.bankDetails.ifsc}</div>
                            <div><strong>UPI ID:</strong> {company.bankDetails.upiId}</div>
                          </div>
                          <div className="std-qr-box">
                            <div className="std-qr-label" style={{ marginBottom: '4px' }}><strong>UPI QR:</strong></div>
                            <img
                              src={getUPIQrUrl(company.bankDetails.upiId, company.companyName, totalAmt, invId)}
                              alt="UPI QR Code"
                              className="std-qr-img"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="std-outer-footer">
                    <p>Thank You For Your Business !</p>
                    <p>Design By {company.companyName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MainDashboard;
