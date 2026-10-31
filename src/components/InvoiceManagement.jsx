import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Filter, Printer, Trash2, CheckCircle, Clock, AlertCircle, Share2, DollarSign, Receipt } from 'lucide-react';
import './InvoiceManagement.css';
import { invoiceApi, customerApi, productApi } from '../api';
import { AuthContext } from '../context/AuthContextValue';

export default function InvoiceManagement({ onBack }) {
  const { user } = React.useContext(AuthContext);
  const [activeView, setActiveView] = useState('dashboard');
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    totalInvoices: 0
  });

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTemplate, setActiveTemplate] = useState('standard'); // 'standard' (Image 1) | 'thermal' (Image 2)

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [newInvoice, setNewInvoice] = useState({
    id: '',
    customer: '',
    customerPhone: '',
    customerGstin: '',
    date: '',
    dueDate: '',
    type: 'Tax Invoice',
    items: [
      { id: 1, productId: '', name: '', description: '', hsnCode: '', qty: 1, rate: 0, tax: 0, amount: 0 }
    ],
    discount: 0,
    discountType: '%',
    paymentStatus: 'Unpaid',
    paymentMethod: 'Cash',
    notes: 'Thank you for your business!',
    terms: 'Goods once sold cannot be returned. Payment due within 15 days.'
  });

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeFilter !== 'All') params.status = activeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [invData, statsData] = await Promise.all([
        invoiceApi.getAll(params),
        invoiceApi.getStats()
      ]);

      setInvoices(invData || []);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  const loadCustomersAndProducts = useCallback(async () => {
    try {
      const [cList, pList] = await Promise.all([
        customerApi.getAll(),
        productApi.getAll()
      ]);
      setCustomers(cList || []);
      setProducts(pList || []);

      if (cList?.length) {
        setNewInvoice(prev => prev.customer ? prev : ({
          ...prev, customer: cList[0].name, customerPhone: cList[0].phone || '', customerGstin: cList[0].gst || ''
        }));
      }
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadInvoices, 0);
    return () => window.clearTimeout(timer);
  }, [loadInvoices]);

  useEffect(() => {
    const timer = window.setTimeout(loadCustomersAndProducts, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomersAndProducts]);

  const handleCustomerSelect = (custName) => {
    const found = customers.find(c => c.name === custName);
    setNewInvoice(prev => ({
      ...prev,
      customer: custName,
      customerPhone: found ? found.phone : '',
      customerGstin: found ? (found.gst || '') : ''
    }));
  };

  const handleProductSelect = (rowId, prodId) => {
    const prod = products.find(p => p._id === prodId || p.productId === prodId);
    if (!prod) return;

    const parsedTax = parseFloat(String(prod.taxRate || '').replace(/[^0-9.]/g, ''));
    const taxNum = Number.isFinite(parsedTax) ? parsedTax : 0;

    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id === rowId) {
          const qty = it.qty || 1;
          const rate = prod.price || 0;
          const itemTax = (qty * rate * taxNum) / 100;
          return {
            ...it,
            productId: prod._id,
            name: prod.name,
            description: prod.category || '',
            hsnCode: prod.hsnCode || '',
            rate,
            tax: taxNum,
            amount: (qty * rate) + itemTax
          };
        }
        return it;
      })
    }));
  };

  const handleAddItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), productId: '', name: '', description: '', hsnCode: '', qty: 1, rate: 0, tax: 0, amount: 0 }
      ]
    }));
  };

  const handleRemoveItem = (id) => {
    if (newInvoice.items.length === 1) return;
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleItemChange = (id, field, value) => {
    setNewInvoice(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          const qty = parseFloat(updated.qty) || 0;
          const rate = parseFloat(updated.rate) || 0;
          const tax = parseFloat(updated.tax) || 0;
          updated.amount = (qty * rate) + ((qty * rate * tax) / 100);
          return updated;
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });
  };

  const subtotal = newInvoice.items.reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)), 0);
  const totalTax = newInvoice.items.reduce((sum, item) => sum + (((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0) * (parseFloat(item.tax) || 0)) / 100), 0);

  let discountAmount = parseFloat(newInvoice.discount) || 0;
  if (newInvoice.discountType === '%') {
    discountAmount = (subtotal * discountAmount) / 100;
  }
  const grandTotal = Math.max(0, subtotal + totalTax - discountAmount);

  const handleSaveInvoice = async () => {
    if (!newInvoice.customer) {
      alert('Please select or specify a customer.');
      return;
    }
    if (grandTotal <= 0) {
      alert('Please add valid billable items to the invoice.');
      return;
    }

    try {
      const matchedCustomer = customers.find(c => c.name === newInvoice.customer);

      const payload = {
        invoiceNumber: newInvoice.id?.trim() || `INV-${Date.now().toString().slice(-6)}`,
        customerId: matchedCustomer?._id || matchedCustomer?.id || '',
        customerName: newInvoice.customer || '',
        customerPhone: newInvoice.customerPhone || '',
        customerGstin: newInvoice.customerGstin || '',
        date: newInvoice.date || new Date().toISOString().slice(0, 10),
        dueDate: newInvoice.dueDate || newInvoice.date || new Date().toISOString().slice(0, 10),
        type: newInvoice.type || 'Tax Invoice',
        items: newInvoice.items.map(it => ({
          productId: it.productId || '',
          name: it.name || '',
          description: it.description || '',
          hsnCode: it.hsnCode || '',
          qty: parseFloat(it.qty) || 1,
          rate: parseFloat(it.rate) || 0,
          taxRate: parseFloat(it.tax) || 0,
          amount: it.amount || 0
        })),
        subtotal: subtotal || 0,
        discount: parseFloat(newInvoice.discount) || 0,
        discountType: newInvoice.discountType || '%',
        discountAmount: discountAmount || 0,
        totalTax: totalTax || 0,
        cgstTotal: (totalTax / 2) || 0,
        sgstTotal: (totalTax / 2) || 0,
        grandTotal: grandTotal || 0,
        totalAmount: grandTotal || 0,
        paidAmount: newInvoice.paymentStatus === 'Paid' ? grandTotal : 0,
        balanceAmount: newInvoice.paymentStatus === 'Paid' ? 0 : grandTotal,
        status: newInvoice.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
        paymentStatus: newInvoice.paymentStatus || 'Unpaid',
        paymentMethod: newInvoice.paymentMethod || 'Cash',
        notes: newInvoice.notes || '',
        terms: newInvoice.terms || ''
      };

      const cleanPayload = JSON.parse(JSON.stringify(payload));

      await invoiceApi.create(cleanPayload);
      alert('✅ Invoice successfully created and saved to database!');
      await loadInvoices();
      setActiveView('dashboard');

      setNewInvoice({
        id: '',
        customer: customers.length > 0 ? customers[0].name : '',
        customerPhone: customers.length > 0 ? customers[0].phone : '',
        customerGstin: customers.length > 0 ? customers[0].gst : '',
        date: '',
        dueDate: '',
        type: 'Tax Invoice',
        items: [{ id: 1, productId: '', name: '', description: '', hsnCode: '', qty: 1, rate: 0, tax: 0, amount: 0 }],
        discount: 0,
        discountType: '%',
        paymentStatus: 'Unpaid',
        paymentMethod: 'Cash',
        notes: 'Thank you for your business!',
        terms: 'Goods once sold cannot be returned.'
      });
    } catch (err) {
      console.error('Failed to create invoice:', err);
      alert(`Error creating invoice: ${err.message}`);
    }
  };

  const handleOpenPreview = (inv) => {
    setSelectedInvoice(inv);
    setActiveView('view');
  };

  const handleDeleteInvoice = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this invoice? Stock will be preserved.')) return;
    try {
      await invoiceApi.delete(id);
      await loadInvoices();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleWhatsAppShare = (inv) => {
    const cust = inv.customerName || inv.customer || 'Customer';
    const num = inv.invoiceNumber || inv.id;
    const total = (inv.grandTotal || inv.amount || 0).toLocaleString('en-IN');
    const msg = `*TAX INVOICE #${num}*\n\nDear ${cust},\nYour invoice for ₹${total} dated ${inv.date ? new Date(inv.date).toLocaleDateString() : 'today'} is generated.\nStatus: ${inv.paymentStatus || inv.status}\n\nThank you for choosing YourBill!`;
    const phone = inv.customerPhone || '';
    const url = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    try {
      await invoiceApi.recordPayment(selectedInvoice._id || selectedInvoice.id, {
        amount: parseFloat(paymentAmount),
        paymentMethod
      });
      alert('✅ Payment recorded successfully!');
      setShowPaymentModal(false);
      setPaymentAmount('');
      await loadInvoices();
      const updated = await invoiceApi.getById(selectedInvoice._id || selectedInvoice.id);
      setSelectedInvoice(updated);
    } catch (err) {
      alert(`Error recording payment: ${err.message}`);
    }
  };

  const renderDashboard = () => (
    <div className="inv-dashboard fade-in">
      <div className="inv-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
          <h2 className="inv-title">Invoice Management</h2>
          <p className="inv-subtitle">Create, track, and manage all your billing documents</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => { setActiveTemplate('thermal'); if (invoices.length > 0) { setSelectedInvoice(invoices[0]); setActiveView('view'); } else { alert('No invoices saved yet. Create an invoice first.'); } }}>
            <Receipt size={16} style={{ marginRight: '6px' }} /> Thermal POS View
          </button>
          <button className="btn-primary rainbow-bg" onClick={() => setActiveView('create')}>
            <Plus size={18} /> Create Invoice
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-green"><CheckCircle size={24} /></div>
          <div className="metric-info">
            <h4>Total Revenue</h4>
            <div className="metric-value">₹{(stats.totalRevenue || 0).toLocaleString('en-IN')}</div>
            <div className="metric-trend positive">From {stats.totalInvoices || 0} Invoices</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-blue"><Clock size={24} /></div>
          <div className="metric-info">
            <h4>Outstanding</h4>
            <div className="metric-value">₹{(stats.totalOutstanding || 0).toLocaleString('en-IN')}</div>
            <div className="metric-trend">Receivable balance</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><AlertCircle size={24} /></div>
          <div className="metric-info">
            <h4>Overdue Invoices</h4>
            <div className="metric-value text-orange">₹{(stats.totalOverdue || 0).toLocaleString('en-IN')}</div>
            <div className="metric-trend negative">Urgent follow-up needed</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-purple"><FileText size={24} /></div>
          <div className="metric-info">
            <h4>Total Paid</h4>
            <div className="metric-value">₹{(stats.totalPaid || 0).toLocaleString('en-IN')}</div>
            <div className="metric-trend positive">Successfully collected</div>
          </div>
        </div>
      </div>

      <div className="inv-section">
        <div className="section-header-row">
          <div className="tabs-simple">
            {['All', 'Paid', 'Unpaid', 'Overdue'].map(st => (
              <button
                key={st}
                className={`tab-simple ${activeFilter === st ? 'active' : ''}`}
                onClick={() => setActiveFilter(st)}
              >
                {st === 'All' ? 'All Invoices' : st}
              </button>
            ))}
          </div>
          <div className="search-filter">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by invoice # or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn-secondary" onClick={() => loadInvoices()}><Filter size={18} /> Refresh</button>
          </div>
        </div>

        <div className="table-container">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Invoice Details</th>
                <th>Customer</th>
                <th>Date / Due Date</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading invoices…</td></tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', opacity: 0.7 }}>
                    No invoices found. Click <strong>+ Create Invoice</strong> to generate your first bill.
                  </td>
                </tr>
              ) : (
                invoices.map(inv => {
                  const invId = inv.invoiceNumber || inv.id || 'INV-000';
                  const custName = inv.customerName || inv.customer || inv.clientName || 'Cash Sale';
                  const amount = inv.grandTotal || inv.amount || 0;
                  const st = inv.paymentStatus || inv.status || 'Unpaid';
                  const dateStr = inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A';
                  const dueStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : dateStr;

                  return (
                    <tr key={inv._id || inv.id} className="clickable-row" onClick={() => handleOpenPreview(inv)}>
                      <td>
                        <div className="invoice-cell">
                          <strong>{invId}</strong>
                          <span className="type-badge">{inv.type || 'Tax Invoice'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <div className="avatar small">{custName.charAt(0)}</div>
                          <span>{custName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <span>{dateStr}</span>
                          <span className="sub-text text-orange">Due: {dueStr}</span>
                        </div>
                      </td>
                      <td>
                        <strong>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </td>
                      <td>
                        <span className={`status-badge ${st.toLowerCase()}`}>{st}</span>
                      </td>
                      <td>
                        <div className="action-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); setActiveTemplate('standard'); setActiveView('view'); }}
                            title="View / Print A4 Tax Invoice"
                          >
                            <FileText size={13} /> A4 View
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); setActiveTemplate('thermal'); setActiveView('view'); }}
                            title="View / Print Thermal POS Slip"
                          >
                            <Receipt size={13} /> Thermal
                          </button>
                          <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(inv); }} title="WhatsApp">
                            <Share2 size={15} />
                          </button>
                          <button className="action-btn text-orange" onClick={(e) => handleDeleteInvoice(e, inv._id || inv.id)} title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCreateInvoice = () => (
    <div className="inv-create-view fade-in">
      <div className="inv-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Invoices</button>
          <h2 className="inv-title">Create New Invoice</h2>
          <p className="inv-subtitle">Standard GST-compliant invoicing connected to inventory and CRM</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setActiveView('dashboard')}>Cancel</button>
          <button className="btn-primary rainbow-bg" onClick={handleSaveInvoice}>Save Invoice & Print</button>
        </div>
      </div>

      <div className="invoice-form-card">
        <div className="inv-form-header">
          <div className="customer-selection" style={{ minWidth: '320px' }}>
            <label>Customer Account *</label>
            <select
              className="large-select"
              value={newInvoice.customer}
              onChange={(e) => handleCustomerSelect(e.target.value)}
            >
              <option value="">-- Select Registered Customer --</option>
              {customers.map(c => (
                <option key={c._id || c.customerId} value={c.name}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder="Or type Walk-in Customer name"
                value={newInvoice.customer}
                onChange={(e) => setNewInvoice({ ...newInvoice, customer: e.target.value })}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <input
                type="text"
                placeholder="Phone"
                value={newInvoice.customerPhone}
                onChange={(e) => setNewInvoice({ ...newInvoice, customerPhone: e.target.value })}
                style={{ width: '130px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="inv-meta-grid">
            <div className="input-group">
              <label>Invoice Number</label>
              <input
                type="text"
                value={newInvoice.id}
                placeholder="Auto-generated when saved"
                onChange={(e) => setNewInvoice({ ...newInvoice, id: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Invoice Type</label>
              <select value={newInvoice.type} onChange={(e) => setNewInvoice({ ...newInvoice, type: e.target.value })}>
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Sale Invoice">Sale Invoice</option>
                <option value="Proforma">Proforma Invoice</option>
                <option value="Cash Bill">Cash Bill</option>
              </select>
            </div>
            <div className="input-group">
              <label>Invoice Date</label>
              <input type="date" value={newInvoice.date} onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Due Date</label>
              <input type="date" value={newInvoice.dueDate} onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Payment Status</label>
              <select value={newInvoice.paymentStatus} onChange={(e) => setNewInvoice({ ...newInvoice, paymentStatus: e.target.value })}>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div className="input-group">
              <label>Payment Mode</label>
              <select value={newInvoice.paymentMethod} onChange={(e) => setNewInvoice({ ...newInvoice, paymentMethod: e.target.value })}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>
          </div>
        </div>

        <div className="inv-items-section">
          <table className="inv-items-table">
            <thead>
              <tr>
                <th width="40%">Item / Product Catalog</th>
                <th width="15%">Qty</th>
                <th width="15%">Unit Rate (₹)</th>
                <th width="15%">GST Slab</th>
                <th width="10%">Amount</th>
                <th width="5%"></th>
              </tr>
            </thead>
            <tbody>
              {newInvoice.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {products.length > 0 && (
                      <select
                        className="item-input"
                        style={{ marginBottom: '4px' }}
                        value={item.productId || ''}
                        onChange={(e) => handleProductSelect(item.id, e.target.value)}
                      >
                        <option value="">-- Quick Pick from Inventory --</option>
                        {products.map(p => (
                          <option key={p._id || p.productId} value={p._id}>
                            {p.name} (₹{p.price} | Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      placeholder="Item name / Service description"
                      className="item-input"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <input
                        type="text"
                        placeholder="HSN/SAC Code"
                        className="item-sub-input"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                        style={{ width: '120px' }}
                      />
                      <input
                        type="text"
                        placeholder="Description / Remarks"
                        className="item-sub-input"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                      className="num-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                      className="num-input"
                    />
                  </td>
                  <td>
                    <select
                      className="tax-select"
                      value={item.tax}
                      onChange={(e) => handleItemChange(item.id, 'tax', e.target.value)}
                    >
                      <option value="18">GST 18%</option>
                      <option value="12">GST 12%</option>
                      <option value="5">GST 5%</option>
                      <option value="28">GST 28%</option>
                      <option value="0">Exempt (0%)</option>
                    </select>
                  </td>
                  <td className="item-amount">
                    ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button className="action-btn text-orange" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-row-btn" onClick={handleAddItem}>
            <Plus size={16} /> Add Another Line Item
          </button>
        </div>

        <div className="inv-form-footer">
          <div className="inv-notes">
            <div className="input-group">
              <label>Customer Notes</label>
              <textarea
                rows="2"
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Terms & Conditions</label>
              <textarea
                rows="2"
                value={newInvoice.terms}
                onChange={(e) => setNewInvoice({ ...newInvoice, terms: e.target.value })}
              />
            </div>
          </div>

          <div className="inv-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="total-row">
              <span>Discount:</span>
              <div className="discount-input">
                <input
                  type="number"
                  placeholder="0"
                  value={newInvoice.discount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, discount: e.target.value })}
                />
                <select
                  value={newInvoice.discountType}
                  onChange={(e) => setNewInvoice({ ...newInvoice, discountType: e.target.value })}
                >
                  <option value="%">%</option>
                  <option value="fixed">₹</option>
                </select>
              </div>
            </div>
            <div className="total-row">
              <span>Total Tax (GST):</span>
              <span>₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="total-row grand-total">
              <span>Grand Total:</span>
              <span className="rainbow-text">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const getCompanyDetails = () => {
    let stored = null;
    try {
      const raw = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('companyProfile');
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }

    const combined = { ...stored, ...user };

    const bank = {
      accountHolder: combined?.bankDetails?.accountHolder || combined?.bankAccountHolder || combined?.name || 'Rahul',
      accountNumber: combined?.bankDetails?.accountNumber || combined?.accountNumber || '12345678910',
      bankName: combined?.bankDetails?.bankName || combined?.bankName || 'Axis',
      branch: combined?.bankDetails?.branch || combined?.branch || 'Delhi',
      ifsc: combined?.bankDetails?.ifsc || combined?.ifsc || 'Axis00',
      upiId: combined?.bankDetails?.upiId || combined?.upiId || (combined?.phone ? `${combined.phone}@upi` : '1234567890@upi')
    };

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
      bankDetails: bank
    };
  };

  const formatInvoiceDate = (dateVal) => {
    if (!dateVal) return '22 May, 2026 01:06 PM';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
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
    if (isNaN(d.getTime())) {
      return { date: '07/04/2026', time: '00:49' };
    }
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

  const getUPIQrUrl = (upiId, companyName, amount, invoiceNo) => {
    const upiIntent = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(companyName)}&am=${Number(amount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Invoice ' + invoiceNo)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiIntent)}`;
  };

  const renderInvoicePreview = () => {
    const inv = selectedInvoice || invoices[0] || {};
    const company = getCompanyDetails();
    const invId = inv.invoiceNumber || inv.id || '62';
    const custName = inv.customerName || inv.customer || inv.clientName || 'Tanmy sharma';
    const custPhone = inv.customerPhone || '';
    const custGstin = inv.customerGstin || '';
    const formattedInvDate = formatInvoiceDate(inv.date);
    const thDate = formatThermalDate(inv.date);
    const invItems = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [
      { id: 1, name: 'Primary Lens', qty: 1, unit: 'Piece', mrp: 69999, rate: 69999, taxRate: 3, amount: 72098.97 },
      { id: 2, name: 'Camera Body', qty: 1, unit: 'Box', mrp: 22999, rate: 22999, taxRate: 3, amount: 23688.97 }
    ];

    const totalQty = invItems.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
    const sub = inv.subtotal ?? invItems.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.rate || 0)), 0);
    const computedTax = invItems.reduce((sum, item) => {
      const q = Number(item.qty || 1);
      const r = Number(item.rate || 0);
      const tr = Number(item.taxRate !== undefined ? item.taxRate : 18);
      return sum + ((q * r * tr) / 100);
    }, 0);
    const taxAmt = inv.totalTax ?? computedTax;
    const cgst = inv.cgstTotal !== undefined ? inv.cgstTotal : (taxAmt / 2);
    const sgst = inv.sgstTotal !== undefined ? inv.sgstTotal : (taxAmt / 2);
    const discountAmt = Number(inv.discountAmount || inv.discount || 0);
    const totalAmt = inv.grandTotal || inv.amount || (sub + taxAmt - discountAmt);
    const st = inv.paymentStatus || inv.status || 'Paid';
    const receivedAmt = inv.paidAmount !== undefined ? Number(inv.paidAmount) : (st === 'Paid' ? totalAmt : 0);
    const balance = inv.balanceAmount !== undefined ? Number(inv.balanceAmount) : Math.max(0, totalAmt - receivedAmt);

    return (
      <div className="inv-preview-view fade-in">
        <div className="inv-header no-print">
          <div>
            <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Invoices</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <h2 className="inv-title">{invId}</h2>
              <span className={`status-badge ${st.toLowerCase()}`}>{st}</span>
              {balance > 0 && (
                <span className="status-badge warning">Balance Due: ₹{balance.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
          <div className="header-actions">
            <div className="bill-format-toggle">
              <button
                type="button"
                className={`bill-format-btn ${activeTemplate === 'standard' ? 'active' : ''}`}
                onClick={() => setActiveTemplate('standard')}
              >
                <FileText size={15} /> 📄 Tax Invoice (A4)
              </button>
              <button
                type="button"
                className={`bill-format-btn ${activeTemplate === 'thermal' ? 'active' : ''}`}
                onClick={() => setActiveTemplate('thermal')}
              >
                <Receipt size={15} /> 🧾 Thermal Receipt (POS)
              </button>
            </div>
            {balance > 0 && (
              <button className="btn-primary" onClick={() => { setPaymentAmount(balance); setShowPaymentModal(true); }}>
                <DollarSign size={16} /> Record Payment
              </button>
            )}
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print / Download PDF
            </button>
            <button className="btn-secondary" onClick={() => handleWhatsAppShare(inv)}>
              <Share2 size={16} /> WhatsApp
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            1. THERMAL POS RECEIPT (IMAGE 2 EXACT MATCH)
            ══════════════════════════════════════════════════════════ */}
        {activeTemplate === 'thermal' ? (
          <div className="thermal-receipt-container">
            {/* Top Logo & Company Info */}
            <div className="th-header">
              <div className="th-logo-square">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div className="th-company-title">{company.companyName}</div>
              <div className="th-address-line">{company.address}</div>
              <div className="th-tagline">{company.tagline || 'Best From Best'}</div>
              <div className="th-phone-line">{company.phone}</div>
              <div className="th-email-line">Email - {company.email}</div>
            </div>

            <hr className="th-dashed-separator" />

            {/* Bill Metadata */}
            <table className="th-meta-table">
              <tbody>
                <tr>
                  <td className="th-meta-label">Bill No #:</td>
                  <td className="th-meta-val">{invId}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">ITEM:</td>
                  <td className="th-meta-val">
                    {invItems.length > 0 ? invItems.map((_, i) => `ITEM110${i}`).join(', ') : 'ITEM1100, ITEM1101'}
                  </td>
                </tr>
                <tr>
                  <td className="th-meta-label">Date:</td>
                  <td className="th-meta-val">{thDate.date}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Time:</td>
                  <td className="th-meta-val">{thDate.time}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Customer Type:</td>
                  <td className="th-meta-val">{inv.customerType || 'DINE_IN'}</td>
                </tr>
                {inv.tableNo && (
                  <tr>
                    <td className="th-meta-label">Table No:</td>
                    <td className="th-meta-val">{inv.tableNo}</td>
                  </tr>
                )}
                <tr>
                  <td className="th-meta-label">Order Status:</td>
                  <td className="th-meta-val">{inv.orderStatus || 'COMPLETED'}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Payment Method:</td>
                  <td className="th-meta-val">{(inv.paymentMethod || 'CASH').toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Payment Status:</td>
                  <td className="th-meta-val">{st.toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Staff Name:</td>
                  <td className="th-meta-val">{inv.staffName || 'OWNER'}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Created By:</td>
                  <td className="th-meta-val">{(company.ownerName || 'OWNER').toUpperCase()}</td>
                </tr>
              </tbody>
            </table>

            {/* Billing To Section */}
            <div className="th-billing-heading">Billing To</div>
            <table className="th-meta-table">
              <tbody>
                <tr>
                  <td className="th-meta-label">Name:</td>
                  <td className="th-meta-val">{custName}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Contact No.:</td>
                  <td className="th-meta-val">{custPhone || '9999999999'}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">GSTIN.:</td>
                  <td className="th-meta-val">{custGstin || company.gstin || 'GSTIN859612356'}</td>
                </tr>
              </tbody>
            </table>

            <hr className="th-dashed-separator" />

            {/* Items Table */}
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
                  const qty = Number(it.qty) || 1;
                  const rate = Number(it.rate || it.price) || 0;
                  const taxRate = Number(it.taxRate !== undefined ? it.taxRate : 18);
                  const mrp = Number(it.mrp || (rate > 0 ? Math.round(rate * 1.1) : 0));
                  const rowAmt = Number(it.amount || (qty * rate) + (qty * (rate * taxRate) / 100));
                  const unit = it.unit ? `${it.unit.toUpperCase()}` : 'CUP';

                  return (
                    <React.Fragment key={idx}>
                      <tr className="th-item-main-row">
                        <td>
                          <div className="th-item-name">{it.name || 'Item Name'}</div>
                          <div className="th-item-sub-detail">MRP ₹{mrp > 0 ? mrp : rate}</div>
                          <div className="th-item-sub-detail">GST: {taxRate}%</div>
                          {it.description && <div className="th-item-sub-detail">{it.description}</div>}
                        </td>
                        <td className="th-center" style={{ verticalAlign: 'middle' }}>
                          {qty} {unit}
                        </td>
                        <td className="th-right" style={{ verticalAlign: 'middle' }}>
                          {rate}
                        </td>
                        <td className="th-right" style={{ verticalAlign: 'middle', fontWeight: 'bold' }}>
                          {rowAmt.toFixed(2)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            <hr className="th-dashed-separator" />

            {/* Totals Section */}
            <table className="th-totals-table">
              <tbody>
                <tr>
                  <td>Item Total:</td>
                  <td className="th-val">₹{Math.round(sub)}</td>
                </tr>
                {discountAmt > 0 && (
                  <tr>
                    <td>Bill Discount:</td>
                    <td className="th-val">- ₹{discountAmt.toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td>Subtotal:</td>
                  <td className="th-val">₹{(sub - discountAmt).toFixed(2)}</td>
                </tr>
                {inv.fixedCharges > 0 && (
                  <tr>
                    <td>Fixed:</td>
                    <td className="th-val">₹{Number(inv.fixedCharges).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td>CGST:</td>
                  <td className="th-val">₹{cgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>SGST:</td>
                  <td className="th-val">₹{sgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Round Off:</td>
                  <td className="th-val">₹{(totalAmt - Math.round(totalAmt)).toFixed(2)}</td>
                </tr>
                <tr className="th-grand-total-row">
                  <td>Grand Total:</td>
                  <td className="th-val">₹{Math.round(totalAmt)}</td>
                </tr>
                <tr>
                  <td>Paid Amount:</td>
                  <td className="th-val">₹{receivedAmt.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <hr className="th-dashed-separator" />

            <table className="th-meta-table">
              <tbody>
                <tr>
                  <td className="th-meta-label">Payment Method:</td>
                  <td className="th-meta-val">{(inv.paymentMethod || 'CASH').toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Bill Status:</td>
                  <td className="th-meta-val">{st.toUpperCase()}</td>
                </tr>
              </tbody>
            </table>

            <div className="th-words-section">
              <div className="th-words-label">Amount in Words</div>
              <div className="th-words-text">{numberToWordsIndian(totalAmt)}</div>
            </div>

            {/* UPI QR Code */}
            <div className="th-qr-section">
              <img
                src={getUPIQrUrl(company.bankDetails.upiId, company.companyName, totalAmt, invId)}
                alt="UPI QR Code"
                className="th-qr-image"
              />
              <div className="th-upi-logo-row">
                <span>UPI</span>
                <span className="th-upi-arrows">
                  <span className="th-upi-green">▶</span>
                  <span className="th-upi-orange">▶</span>
                </span>
              </div>
              <div className="th-scan-btn">SCAN TO PAY</div>
            </div>

            <hr className="th-dashed-separator" />

            {/* Terms & Conditions */}
            <div className="th-tc-section">
              <div className="th-tc-heading">T &amp; C</div>
              <div className="th-tc-line">1. Goods once sold will not be taken back or exchanged.</div>
              <div className="th-tc-line">2. All disputes are subject to jurisdiction only.</div>
            </div>

            <hr className="th-dashed-separator" />

            {/* Footer Branding */}
            <div className="th-footer-section">
              <div className="th-powered-by">
                Powered by <strong>{company.companyName}</strong>
              </div>
              <div className="th-grow-line">Grow with {company.companyName}!</div>
              <div className="th-maroon-banner-1">Thank You, Visit Again.</div>
              <div className="th-maroon-banner-2">Feels Best</div>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════
              2. STANDARD TAX INVOICE (IMAGE 1 EXACT MATCH)
              ══════════════════════════════════════════════════════════ */
          <div className="standard-inv-container">
            <div className="standard-inv-watermark-top">ORIGINAL FOR RECIPIENT</div>

            <div className="standard-inv-box">
              {/* Header: Company Details */}
              <div className="std-header-section">
                <h1 className="std-company-name">{company.companyName}</h1>
                <div className="std-header-text">Phone: {company.phone}</div>
                <div className="std-header-text">Email: {company.email}</div>
                {company.gstin && <div className="std-header-text">GSTIN: {company.gstin}</div>}
              </div>

              {/* Two-Column: Bill To vs Invoice Details */}
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

              {/* Items Table */}
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
                    const qty = Number(it.qty) || 1;
                    const rate = Number(it.rate || it.price) || 0;
                    const taxRate = Number(it.taxRate !== undefined ? it.taxRate : (it.tax !== undefined ? it.tax : 3));
                    const mrp = Number(it.mrp || (rate > 0 ? Math.round(rate) : 0));
                    const taxPerUnit = (rate * taxRate) / 100;
                    const rowAmt = Number(it.amount || (qty * rate) + (qty * taxPerUnit));
                    const unit = it.unit || (idx === 0 ? 'Piece' : 'Box');

                    return (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>
                          <div className="std-item-cell">
                            {it.imageUrl ? (
                              <img src={it.imageUrl} alt={it.name} className="std-item-thumb" />
                            ) : (
                              <div className="std-item-thumb-placeholder">📷</div>
                            )}
                            <span className="std-item-name">{it.name || 'Primary Lens'}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{it.hsnCode || it.hsn || ''}</td>
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

              {/* Received Amount & Balance Row */}
              <div className="std-received-row">
                <div className="std-received-left">
                  Received Amount: ₹{receivedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="std-received-right">
                  Balance: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Remark Row */}
              <div className="std-remark-row">
                <strong>Remark:</strong> {inv.notes || inv.remark || ''}
              </div>

              {/* Terms & Conditions + Bank Details */}
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

            {/* Outer Center Tagline */}
            <div className="std-outer-footer">
              <p>Thank You For Your Business !</p>
              <p>Design By {company.companyName || 'Stock It'}</p>
            </div>
          </div>
        )}

        {showPaymentModal && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--border-color)' }}>
              <h3>Record Payment for {invId}</h3>
              <p style={{ margin: '0.5rem 0 1rem', opacity: 0.8 }}>Customer: {custName}</p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem' }}>Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem' }}>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Net Banking">Net Banking / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleRecordPayment}>Confirm Payment</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="invoice-management-wrapper">
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'create' && renderCreateInvoice()}
      {activeView === 'view' && renderInvoicePreview()}
    </div>
  );
}