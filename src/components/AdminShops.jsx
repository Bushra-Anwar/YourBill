import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Boxes, FileText, UsersRound, CreditCard, Search, RefreshCw, Plus, Bell, MapPin } from 'lucide-react';
import { adminApi } from '../api';
import './AdminShops.css';

const formatMoney = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function AdminShops({ onBack }) {
  const [shops, setShops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [branchBusy, setBranchBusy] = useState(false);

  const loadShops = async () => {
    setBusy(true); setError('');
    try { setShops(await adminApi.getShops()); }
    catch (err) { setError(err.message || 'Could not load shops.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { const timer = window.setTimeout(loadShops, 0); return () => window.clearTimeout(timer); }, []);

  const openShop = async shop => {
    setSelected(shop); setShopData(null); setBusy(true); setError('');
    try { setShopData(await adminApi.getShopData(shop._id)); }
    catch (err) { setError(err.message || 'Could not load shop data.'); }
    finally { setBusy(false); }
  };

  const addBranch = async event => {
    event.preventDefault();
    if (!selected || !branchForm.name.trim()) return;
    setBranchBusy(true); setError('');
    try {
      const result = await adminApi.addBranch(selected._id, branchForm);
      setShopData(current => ({ ...current, shop: { ...current.shop, branches: result.branches } }));
      setSelected(current => ({ ...current, branches: result.branches }));
      setShops(current => current.map(shop => shop._id === selected._id ? { ...shop, branches: result.branches } : shop));
      setBranchForm({ name: '', address: '', phone: '' });
    } catch (err) { setError(err.message || 'Could not add this branch.'); }
    finally { setBranchBusy(false); }
  };

  const visibleShops = shops.filter(shop => `${shop.companyName} ${shop.name} ${shop.email}`.toLowerCase().includes(query.toLowerCase()));
  const renewalAlerts = shops.filter(shop => shop.renewalDueSoon);
  const expiryLabel = shop => {
    const date = shop.subscriptionStatus === 'trial' ? shop.trialEndsAt : shop.subscriptionEndsAt;
    return date ? new Date(date).toLocaleDateString() : 'No expiry date recorded';
  };

  return <main className="profile-settings-page fade-in">
    <header className="ps-heading"><div><button className="back-btn ps-back" onClick={selected ? () => { setSelected(null); setShopData(null); setError(''); } : onBack}><ArrowLeft size={16} /> {selected ? 'All shops' : 'Back'}</button><p className="ps-eyebrow">ADMINISTRATOR</p><h1>{selected?.companyName || 'All Shops & Data'}</h1><p className="ps-subtitle">{selected ? `${selected.name || ''} · ${selected.email}` : 'Secure overview of every registered business and its workspace records.'}</p></div><button className="btn-secondary" onClick={selected ? () => openShop(selected) : loadShops}><RefreshCw size={16} /> Refresh</button></header>
    {error && <div className="ps-message error" role="alert">{error}</div>}
    {!selected && <>
      <label style={{ display:'flex', alignItems:'center', gap:'.6rem', margin:'1rem 0', padding:'.7rem 1rem', border:'1px solid var(--glass-border)', borderRadius:12, background:'var(--glass-bg)' }}><Search size={17} /><input aria-label="Search shops" placeholder="Search business, owner, or email" value={query} onChange={event => setQuery(event.target.value)} style={{ width:'100%', border:0, outline:0, color:'var(--text-main)', background:'transparent' }} /></label>
      {renewalAlerts.length > 0 && <section className="admin-renewal-alerts"><h2><Bell size={18} /> Subscription expiry alerts <span>{renewalAlerts.length}</span></h2><div>{renewalAlerts.map(shop => <p key={shop._id}><strong>{shop.companyName}</strong> · {shop.subscriptionStatus === 'trial' ? 'Trial' : shop.plan} {shop.daysUntilExpiry === 0 ? 'expires today' : `expires in ${shop.daysUntilExpiry} day${shop.daysUntilExpiry === 1 ? '' : 's'}`} · {shop.email}</p>)}</div></section>}
      {busy && !shops.length ? <p>Loading shop accounts…</p> : <div className="admin-shops-grid">{visibleShops.map(shop => <button type="button" className="admin-shop-card" key={shop._id} onClick={() => openShop(shop)}><div className="admin-shop-card-title"><span><Building2 size={18} /></span><span><strong>{shop.companyName}</strong><small>{shop.name} · {shop.email}</small></span></div><div className="admin-shop-plan"><span>{shop.plan || 'Starter'}</span><span className={`admin-shop-status ${shop.subscriptionStatus}`}>{shop.subscriptionStatus}</span></div><div className="admin-shop-expiry">{shop.subscriptionStatus === 'trial' ? 'Trial ends' : 'Renews / expires'}: <strong>{expiryLabel(shop)}</strong>{shop.renewalDueSoon && <em>Expiring soon</em>}</div><div className="admin-shop-metrics"><span><UsersRound size={15} />{shop.metrics?.customers || 0} buyers</span><span><FileText size={15} />{shop.metrics?.invoices || 0} invoices</span><span><Boxes size={15} />{shop.metrics?.products || 0} products</span><span><MapPin size={15} />{shop.branches?.length || 0} branches</span><span><CreditCard size={15} />{formatMoney(shop.metrics?.collected)} collected</span></div></button>)}{!visibleShops.length && <p>No registered shops match this search.</p>}</div>}
    </>}
    {selected && (busy && !shopData ? <p>Loading business records…</p> : shopData && <>
      <div className="admin-shop-record-summary"><span><strong>{shopData.customers.length}</strong> buyers</span><span><strong>{shopData.invoices.length}</strong> invoices</span><span><strong>{shopData.products.length}</strong> products</span><span><strong>{shopData.payments.length}</strong> payments</span><span><strong>{shopData.quotations.length}</strong> quotations</span><span><strong>{shopData.expenses.length}</strong> expenses</span></div>
      <section className="admin-branch-panel"><div><p className="ps-eyebrow">BRANCH MANAGEMENT</p><h2>Branches for {shopData.shop.companyName}</h2><p>Add branch locations to this business profile.</p></div><form onSubmit={addBranch}><input aria-label="Branch name" placeholder="Branch name *" required value={branchForm.name} onChange={event => setBranchForm({ ...branchForm, name: event.target.value })} /><input aria-label="Branch address" placeholder="Address (optional)" value={branchForm.address} onChange={event => setBranchForm({ ...branchForm, address: event.target.value })} /><input aria-label="Branch phone" placeholder="Phone (optional)" value={branchForm.phone} onChange={event => setBranchForm({ ...branchForm, phone: event.target.value })} /><button className="btn-primary" disabled={branchBusy}><Plus size={16} />{branchBusy ? 'Adding…' : 'Add branch'}</button></form><div className="admin-branch-list">{(shopData.shop.branches || []).length ? shopData.shop.branches.map(branch => <article key={branch._id}><Building2 size={17} /><span><strong>{branch.name}</strong><small>{[branch.address, branch.phone].filter(Boolean).join(' · ') || 'No address or phone added'}</small></span></article>) : <p>No branches added yet.</p>}</div></section>
      <div className="admin-shop-record-sections">{[
        ['Invoices', shopData.invoices, row => `${row.invoiceNumber || 'Invoice'} · ${row.customerName || 'Customer'} · ${formatMoney(row.grandTotal || row.amount)}`],
        ['Buyers', shopData.customers, row => `${row.name || 'Buyer'} · ${row.email || row.phone || 'No contact'}`],
        ['Products', shopData.products, row => `${row.name || 'Product'} · ${row.type || 'Item'} · ${formatMoney(row.price)}`],
        ['Payments', shopData.payments, row => `${row.invoiceNumber || 'Payment'} · ${row.customerName || 'Customer'} · ${formatMoney(row.amount)}`],
        ['Quotations', shopData.quotations, row => `${row.quoteNumber || row.quotationNumber || 'Quote'} · ${row.customer || 'Customer'} · ${formatMoney(row.amount)}`],
        ['Expenses', shopData.expenses, row => `${row.expenseNumber || row.category || 'Expense'} · ${row.vendor || ''} · ${formatMoney(row.amount)}`]
      ].map(([title, rows, describe]) => <section className="admin-shop-record-section" key={title}><h2>{title} <small>{rows.length}</small></h2>{rows.length ? <ul>{rows.map(row => <li key={row._id}>{describe(row)}</li>)}</ul> : <p>No records saved.</p>}</section>)}</div>
    </>)}
  </main>;
}
