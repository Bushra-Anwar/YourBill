import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Filter, Printer, Trash2, CheckCircle, Clock, AlertCircle, Share2, DollarSign } from 'lucide-react';
import './InvoiceManagement.css';
import { invoiceApi, customerApi, productApi } from '../api';
import { AuthContext } from '../context/AuthContextValue';

export default function InvoiceManagement({ onBack }) {
  const { user } = React.useContext(AuthContext);
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, create, view
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
  const [activeTemplate, setActiveTemplate] = useState('modern');

  // Payment recording state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Form State for creating new invoice
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

  // Calculations
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
      const payload = {
        invoiceNumber: newInvoice.id || undefined,
        customerId: customers.find(customer => customer.name === newInvoice.customer)?._id,
        customerName: newInvoice.customer,
        customerPhone: newInvoice.customerPhone,
        customerGstin: newInvoice.customerGstin,
        date: newInvoice.date,
        dueDate: newInvoice.dueDate || newInvoice.date,
        type: newInvoice.type,
        items: newInvoice.items.map(it => ({
          productId: it.productId,
          name: it.name,
          description: it.description,
          hsnCode: it.hsnCode,
          qty: parseFloat(it.qty) || 1,
          rate: parseFloat(it.rate) || 0,
          taxRate: parseFloat(it.tax) || 0,
          amount: it.amount
        })),
        subtotal,
        discount: parseFloat(newInvoice.discount) || 0,
        discountType: newInvoice.discountType,
        discountAmount,
        totalTax,
        cgstTotal: totalTax / 2,
        sgstTotal: totalTax / 2,
        grandTotal,
        totalAmount: grandTotal,
        paidAmount: newInvoice.paymentStatus === 'Paid' ? grandTotal : 0,
        balanceAmount: newInvoice.paymentStatus === 'Paid' ? 0 : grandTotal,
        status: newInvoice.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
        paymentStatus: newInvoice.paymentStatus,
        paymentMethod: newInvoice.paymentMethod,
        notes: newInvoice.notes,
        terms: newInvoice.terms
      };

      await invoiceApi.create(payload);
      alert('✅ Invoice successfully created and saved to database!');
      await loadInvoices();
      setActiveView('dashboard');

      // Reset form
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
          <button className="btn-secondary" onClick={() => setActiveTemplate('thermal')}>POS Thermal View</button>
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
                        <div className="action-group">
                          <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleOpenPreview(inv); }} title="View / Print">
                            <Printer size={16} />
                          </button>
                          <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(inv); }} title="WhatsApp">
                            <Share2 size={16} />
                          </button>
                          <button className="action-btn text-orange" onClick={(e) => handleDeleteInvoice(e, inv._id || inv.id)} title="Delete">
                            <Trash2 size={16} />
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

        {/* Invoice Line Items */}
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

        {/* Invoice Footer / Totals */}
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

  const renderInvoicePreview = () => {
    const inv = selectedInvoice || invoices[0] || {};
    const invId = inv.invoiceNumber || inv.id || 'Invoice';
    const custName = inv.customerName || inv.customer || inv.clientName || 'Cash Sale';
    const custPhone = inv.customerPhone || '';
    const custGstin = inv.customerGstin || '';
    const dateStr = inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—';
    const dueStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : dateStr;
    const invItems = Array.isArray(inv.items) ? inv.items : [];
    const totalAmt = inv.grandTotal || inv.amount || 0;
    const sub = inv.subtotal ?? invItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
    const computedTax = invItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0) - Number(item.discount || 0)) * Number(item.taxRate || 0) / 100, 0);
    const taxAmt = inv.totalTax ?? computedTax;
    const cgst = inv.cgstTotal !== undefined ? inv.cgstTotal : (taxAmt / 2);
    const sgst = inv.sgstTotal !== undefined ? inv.sgstTotal : (taxAmt / 2);
    const discountAmt = inv.discountAmount || 0;
    const st = inv.paymentStatus || inv.status || 'Unpaid';
    const balance = inv.balanceAmount !== undefined ? inv.balanceAmount : (st === 'Paid' ? 0 : totalAmt);
    const themeColor = activeTemplate === 'corporate' ? '#1e3a8a' : activeTemplate === 'minimal' ? '#0f766e' : '#6b21a8';

    return (
      <div className="inv-preview-view fade-in">
        {/* Screen-only action bar */}
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
            <select
              value={activeTemplate}
              onChange={(e) => setActiveTemplate(e.target.value)}
              style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
            >
              <option value="modern">A4 Modern (Indigo)</option>
              <option value="corporate">A4 Corporate Blue</option>
              <option value="minimal">A5 Minimal (Teal)</option>
              <option value="thermal">POS Thermal Receipt</option>
            </select>
            {balance > 0 && (
              <button className="btn-primary" onClick={() => { setPaymentAmount(balance); setShowPaymentModal(true); }}>
                <DollarSign size={16} /> Record Payment
              </button>
            )}
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print / PDF
            </button>
            <button className="btn-secondary" onClick={() => handleWhatsAppShare(inv)}>
              <Share2 size={16} /> WhatsApp
            </button>
          </div>
        </div>

        {/* ── PRINTABLE INVOICE ── */}
        {activeTemplate === 'thermal' ? (
          <div className="thermal-wrapper">
            <div className="thermal-header">
              <h3>{user?.companyName || 'Business'}</h3>
              {user?.address && <p>{user.address}</p>}
              {(user?.city || user?.state || user?.pincode) && <p>{[user.city, user.state, user.pincode].filter(Boolean).join(', ')}</p>}
              {user?.gstin && <p>GSTIN: {user.gstin}</p>}
              {user?.phone && <p>Phone: {user.phone}</p>}
            </div>
            <div className="thermal-info">
              <div className="thermal-info-row"><span className="tlabel">INV NO:</span><span>{invId}</span></div>
              <div className="thermal-info-row"><span className="tlabel">DATE:</span><span>{dateStr}</span></div>
              <div className="thermal-info-row"><span className="tlabel">CUSTOMER:</span><span>{custName}</span></div>
              {custPhone && <div className="thermal-info-row"><span className="tlabel">PHONE:</span><span>{custPhone}</span></div>}
            </div>
            <div className="thermal-items">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '44%', textAlign: 'left' }}>ITEM</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>QTY</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>RATE</th>
                    <th style={{ width: '24%', textAlign: 'right' }}>AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {invItems.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.name || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{it.qty || 1}</td>
                      <td style={{ textAlign: 'right' }}>₹{(it.rate || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{(it.amount || it.total || ((it.qty || 1) * (it.rate || 0))).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="thermal-totals">
              <div className="thermal-total-row"><span>Subtotal:</span><span>₹{sub.toFixed(2)}</span></div>
              <div className="thermal-total-row"><span>CGST:</span><span>₹{cgst.toFixed(2)}</span></div>
              <div className="thermal-total-row"><span>SGST:</span><span>₹{sgst.toFixed(2)}</span></div>
              {discountAmt > 0 && <div className="thermal-total-row"><span>Discount:</span><span>-₹{discountAmt.toFixed(2)}</span></div>}
              <div className="thermal-total-row thermal-grand"><span>TOTAL:</span><span>₹{totalAmt.toFixed(2)}</span></div>
              <div className="thermal-total-row" style={{ marginTop: '6px', fontSize: '12px' }}>
                <span>Status:</span><span>{st} ({inv.paymentMethod || 'Cash'})</span>
              </div>
            </div>
            <div className="thermal-footer">
              <p>Thank you for your business!</p>
              <p>Visit again soon!</p>
            </div>
          </div>
        ) : (
          /* ── A4 / A5 INVOICE ── */
          <div className={`invoice-paper template-${activeTemplate}`}>
            {st === 'Paid' && <div className="watermark-paid">PAID</div>}

            {/* Header */}
            <div className="paper-header" style={{ borderBottom: `3px solid ${themeColor}` }}>
              <div className="company-details">
                <h1 style={{ color: themeColor }}>🏢 {user?.companyName || 'Your Business'}</h1>
                {(user?.gstin || user?.pan) && <p>{user?.gstin && <><strong>GSTIN:</strong> {user.gstin}</>}{user?.gstin && user?.pan && '  |  '}{user?.pan && <><strong>PAN:</strong> {user.pan}</>}</p>}
                {[user?.address, user?.city, user?.state, user?.pincode].filter(Boolean).length > 0 && <p>{[user?.address, user?.city, user?.state, user?.pincode].filter(Boolean).join(', ')}</p>}
                {(user?.phone || user?.email) && <p>{user?.phone && <>Phone: {user.phone}</>}{user?.phone && user?.email && '  |  '}{user?.email && <>Email: {user.email}</>}</p>}
              </div>
              <div className="invoice-title-area">
                <h2 style={{ color: themeColor }}>{inv.type || 'TAX INVOICE'}</h2>
                <table className="inv-meta-table">
                  <tbody>
                    <tr><td>Invoice No:</td><td>{invId}</td></tr>
                    <tr><td>Invoice Date:</td><td>{dateStr}</td></tr>
                    <tr><td>Due Date:</td><td>{dueStr}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Billing Details */}
            <div className="billing-section">
              <div className="bill-to-box">
                <span className="section-label-strip" style={{ background: themeColor }}>BILLED TO</span>
                <div className="box-content" style={{ border: `1.5px solid ${themeColor}` }}>
                  <div className="customer-name">{custName}</div>
                  {custPhone && <div className="customer-detail">📞 {custPhone}</div>}
                  {custGstin && <div className="customer-detail">GSTIN: {custGstin}</div>}
                  <div className="customer-detail">Payment Mode: {inv.paymentMethod || 'Cash'}</div>
                </div>
              </div>
              <div className="payment-info-box">
                <span className="pay-label">Payment Status</span>
                <div className="pay-method">{inv.paymentMethod || 'Cash'}</div>
                <span className={`pay-badge ${st.toLowerCase()}`}>{st}</span>
                {balance > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                    Balance Due: ₹{balance.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table className="paper-table">
              <thead>
                <tr>
                  {['#', 'ITEM DESCRIPTION', 'HSN/SAC', 'QTY', 'RATE (₹)', 'TAX %', 'AMOUNT (₹)'].map(h => (
                    <th key={h} style={{ background: themeColor }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invItems.map((it, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <span className="item-name">{it.name || '—'}</span>
                      {it.description && <span className="item-desc">{it.description}</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>{it.hsnCode || '998311'}</td>
                    <td style={{ textAlign: 'center' }}>{it.qty || 1}</td>
                    <td style={{ textAlign: 'right' }}>₹{(it.rate || it.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'center' }}>{it.taxRate !== undefined ? `${it.taxRate}%` : '18%'}</td>
                    <td style={{ fontWeight: 'bold', textAlign: 'right' }}>
                      ₹{(it.amount || it.total || ((it.qty || 1) * (it.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer: Terms + Totals */}
            <div className="paper-footer">
              <div className="terms-area">
                <h4>Terms &amp; Conditions</h4>
                <ol>
                  <li>{inv.terms || 'Payment due within 15 days.'}</li>
                  <li>Goods once sold are covered under manufacturer warranty.</li>
                  <li>Disputes subject to Mumbai jurisdiction.</li>
                </ol>
                <div className="thankyou-note">✅ {inv.notes || 'Thank you for your business!'}</div>
              </div>

              <div className="paper-totals">
                <div className="p-total-row">
                  <span>Subtotal</span>
                  <span>₹{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="tax-breakup-row">
                  <span>CGST</span>
                  <span>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="tax-breakup-row">
                  <span>SGST</span>
                  <span>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="p-total-row" style={{ color: '#16a34a' }}>
                    <span>Discount</span>
                    <span>–₹{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="p-total-row p-grand-total" style={{ background: themeColor }}>
                  <span>Grand Total</span>
                  <span>₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="sign-area">
                  <div style={{ height: '40px' }}></div>
                  <p>Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
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
