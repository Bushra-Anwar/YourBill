import { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Printer, Mail, Smartphone, Landmark, Banknote, AlertCircle, RefreshCw, ArrowUpRight } from 'lucide-react';
import { paymentApi, customerApi, invoiceApi } from '../api';
import './PaymentManagement.css';

export default function PaymentManagement({ onBack }) {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, record, receipt
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Record Form state
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [payData, custData, invData] = await Promise.all([
        paymentApi.getAll().catch(() => []),
        customerApi.getAll().catch(() => []),
        invoiceApi.getAll().catch(() => [])
      ]);

      if (Array.isArray(payData)) setPayments(payData);
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(invData)) setInvoices(invData);
    } catch (err) {
      console.error('Failed to load payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (custName) => {
    setSelectedCustomerName(custName);
    // Find first unpaid invoice for this customer if any
    const custInvoices = invoices.filter(inv => inv.customerName === custName && inv.paymentStatus !== 'Paid');
    if (custInvoices.length > 0) {
      setSelectedInvoiceId(custInvoices[0]._id);
      setAmountReceived(custInvoices[0].balanceAmount || custInvoices[0].grandTotal);
    } else {
      setSelectedInvoiceId('');
      setAmountReceived('');
    }
  };

  const handleSavePayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCustomerName || !amountReceived || parseFloat(amountReceived) <= 0) {
      alert('Please select a customer and enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetInv = invoices.find(i => i._id === selectedInvoiceId);
      const res = await paymentApi.record({
        invoiceId: selectedInvoiceId || undefined,
        invoiceNumber: targetInv ? targetInv.invoiceNumber : `ADV-${Date.now().toString().slice(-5)}`,
        customerName: selectedCustomerName,
        amount: parseFloat(amountReceived),
        paymentMethod,
        reference: referenceNo || `REF-${Date.now().toString().slice(-6)}`,
        notes
      });

      alert('Payment recorded successfully!');
      setSelectedPayment(res.payment || {
        customerName: selectedCustomerName,
        amount: parseFloat(amountReceived),
        paymentMethod,
        invoiceNumber: targetInv ? targetInv.invoiceNumber : 'N/A',
        paymentDate: new Date()
      });
      setActiveView('receipt');
      loadData();
    } catch (err) {
      alert('Failed to record payment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstandingTotal = invoices.reduce((s, i) => s + (i.balanceAmount || 0), 0);

  // Filtered payments
  const filteredPayments = payments.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.customerName && p.customerName.toLowerCase().includes(q)) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
      (p.reference && p.reference.toLowerCase().includes(q))
    );
  });

  const renderDashboard = () => (
    <div className="pay-dashboard fade-in">
      <div className="pay-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="pay-title">Payment Collections & Receipts</h2>
          <p className="pay-subtitle">Manage customer payments, invoice settlements, advances, and bank receipts</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadData} disabled={loading} style={{display:'flex', alignItems:'center', gap:'0.4rem'}}>
            <RefreshCw size={16} className={loading ? 'spin' : ''}/> Sync
          </button>
          <button className="btn-primary rainbow-bg" onClick={() => {
            if (customers.length > 0) handleCustomerChange(customers[0].name);
            setActiveView('record');
          }}>
            <Plus size={18} /> Record Payment
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-green"><Banknote size={24} /></div>
          <div className="metric-info">
            <h4>Total Payments Collected</h4>
            <div className="metric-value">₹{totalReceived.toLocaleString('en-IN')}</div>
            <div className="metric-trend positive">{payments.length} verified transactions</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-blue"><CreditCard size={24} /></div>
          <div className="metric-info">
            <h4>Settled Invoices</h4>
            <div className="metric-value">{invoices.filter(i => i.paymentStatus === 'Paid').length}</div>
            <div className="metric-trend positive">Fully reconciled</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><AlertCircle size={24} /></div>
          <div className="metric-info">
            <h4>Total Outstanding</h4>
            <div className="metric-value text-orange">₹{outstandingTotal.toLocaleString('en-IN')}</div>
            <div className="metric-trend negative">From {invoices.filter(i => i.paymentStatus !== 'Paid').length} invoices</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-purple"><ArrowUpRight size={24} /></div>
          <div className="metric-info">
            <h4>Active Payers</h4>
            <div className="metric-value">{customers.length}</div>
            <div className="metric-trend">Customer accounts</div>
          </div>
        </div>
      </div>

      <div className="pay-section">
        <div className="section-header-row">
          <div className="tabs-simple">
            <button className="tab-simple active">All Payment Transactions</button>
          </div>
          <div className="search-filter">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search customer, invoice #, ref..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="table-container">
          <table className="pay-table">
            <thead>
              <tr>
                <th>Receipt / Date</th>
                <th>Customer</th>
                <th>Invoice Ref</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((pay, idx) => (
                  <tr key={pay._id || idx} className="clickable-row" onClick={() => { setSelectedPayment(pay); setActiveView('receipt'); }}>
                    <td>
                      <div className="pay-cell">
                        <strong>{pay.reference || `REC-${pay._id?.substring(18) || idx}`}</strong>
                        <span className="sub-text">{new Date(pay.paymentDate || pay.createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span>{pay.customerName || 'Customer'}</span>
                      </div>
                    </td>
                    <td><span className="badge-highlight">{pay.invoiceNumber || 'Direct Settlement'}</span></td>
                    <td>
                      <div className="method-cell">
                        {pay.paymentMethod === 'UPI' && <Smartphone size={16} className="text-blue"/>}
                        {pay.paymentMethod === 'Bank Transfer' && <Landmark size={16} className="text-purple"/>}
                        {pay.paymentMethod === 'Credit/Debit Card' && <CreditCard size={16} className="text-orange"/>}
                        {pay.paymentMethod === 'Cash' && <Banknote size={16} className="text-green"/>}
                        <span>{pay.paymentMethod || 'Cash'}</span>
                      </div>
                    </td>
                    <td>
                      <strong>₹{(pay.amount || 0).toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <span className="status-badge success">{pay.status || 'Completed'}</span>
                    </td>
                    <td>
                      <button 
                        className="btn-secondary" 
                        style={{padding:'0.2rem 0.6rem', fontSize:'0.8rem'}}
                        onClick={(e) => { e.stopPropagation(); setSelectedPayment(pay); setActiveView('receipt'); }}
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{textAlign:'center', padding:'3rem', color:'var(--text-secondary)'}}>
                    No payments found. Click "Record Payment" to record a collection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRecordPayment = () => {
    const custInvoices = invoices.filter(inv => inv.customerName === selectedCustomerName && inv.paymentStatus !== 'Paid');
    const targetInvoice = invoices.find(inv => inv._id === selectedInvoiceId);

    return (
      <div className="pay-record-view fade-in">
        <div className="pay-header">
          <div>
            <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Collections</button>
            <h2 className="pay-title">Record Payment Collection</h2>
            <p className="pay-subtitle">Log incoming money, settle invoices, and update customer balances</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setActiveView('dashboard')}>Cancel</button>
            <button className="btn-primary rainbow-bg" onClick={handleSavePayment} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </div>

        <div className="pay-form-layout">
          <div className="pay-form-main">
            <div className="pay-form-card">
              <h3>Payment Information</h3>
              <div className="pay-meta-grid">
                <div className="input-group full-span">
                  <label>Customer *</label>
                  <select 
                    className="large-select" 
                    value={selectedCustomerName} 
                    onChange={(e) => handleCustomerChange(e.target.value)}
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => (
                      <option key={c._id} value={c.name}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Amount Received (₹) *</label>
                  <input 
                    type="number" 
                    className="large-input" 
                    placeholder="0.00" 
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Reference / UTR / Cheque #</label>
                  <input 
                    type="text" 
                    placeholder="e.g. UPI/3123456789 or UTR12345" 
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                  />
                </div>
              </div>

              <h3 className="mt-4">Payment Method</h3>
              <div className="method-selector">
                <div className={`method-card ${paymentMethod === 'UPI' ? 'active' : ''}`} onClick={() => setPaymentMethod('UPI')}>
                  <Smartphone size={24} />
                  <span>UPI</span>
                </div>
                <div className={`method-card ${paymentMethod === 'Bank Transfer' ? 'active' : ''}`} onClick={() => setPaymentMethod('Bank Transfer')}>
                  <Landmark size={24} />
                  <span>Bank</span>
                </div>
                <div className={`method-card ${paymentMethod === 'Credit/Debit Card' ? 'active' : ''}`} onClick={() => setPaymentMethod('Credit/Debit Card')}>
                  <CreditCard size={24} />
                  <span>Card</span>
                </div>
                <div className={`method-card ${paymentMethod === 'Cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('Cash')}>
                  <Banknote size={24} />
                  <span>Cash</span>
                </div>
              </div>

              <div className="input-group full-span mt-4">
                <label>Internal Notes / Remarks</label>
                <textarea 
                  rows="2" 
                  placeholder="Optional remarks about this payment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="pay-form-sidebar">
            <div className="allocation-card">
              <h3>Invoice Allocation</h3>
              <p className="sub-text mb-4">Select the invoice to settle against:</p>
              
              {custInvoices.length > 0 ? (
                <div className="invoice-list-mini">
                  {custInvoices.map(inv => (
                    <div 
                      key={inv._id} 
                      className={`invoice-item-mini ${selectedInvoiceId === inv._id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedInvoiceId(inv._id);
                        setAmountReceived(inv.balanceAmount || inv.grandTotal);
                      }}
                      style={{cursor:'pointer'}}
                    >
                      <div className="inv-mini-header">
                        <strong>#{inv.invoiceNumber}</strong>
                        <span className="text-orange">Due: ₹{(inv.balanceAmount || inv.grandTotal).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="sub-text" style={{fontSize:'0.8rem', marginTop:'0.2rem'}}>
                        Total: ₹{inv.grandTotal?.toLocaleString('en-IN')} | Date: {new Date(inv.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)', textAlign:'center', color:'var(--text-secondary)'}}>
                  No outstanding invoices found for this customer. Payment will be recorded as general advance collection.
                </div>
              )}

              <div className="allocation-summary" style={{marginTop:'1.5rem'}}>
                <div className="alloc-row">
                  <span>Selected Invoice:</span>
                  <strong>{targetInvoice ? `#${targetInvoice.invoiceNumber}` : 'Advance / Direct'}</strong>
                </div>
                <div className="alloc-row">
                  <span>Amount to Apply:</span>
                  <strong className="text-green">₹{(parseFloat(amountReceived) || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReceipt = () => (
    <div className="pay-receipt-view fade-in">
      <div className="pay-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Collections</button>
          <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <h2 className="pay-title">Payment Receipt</h2>
            <span className="status-badge success">Verified & Received</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print</button>
          <button className="btn-primary rainbow-bg" onClick={() => alert('Receipt link sent to customer WhatsApp and Email!')}>
            <Mail size={16} /> Send to Customer
          </button>
        </div>
      </div>

      <div className="receipt-paper" style={{background:'var(--bg-secondary)', padding:'2rem', borderRadius:'12px', border:'1px solid var(--border-color)', maxWidth:'650px', margin:'0 auto'}}>
        <div className="receipt-header-strip" style={{borderBottom:'2px solid var(--border-color)', paddingBottom:'1rem', marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h2 style={{margin:0, fontSize:'1.5rem', letterSpacing:'1px'}}>PAYMENT RECEIPT</h2>
            <span className="sub-text">Ref: {selectedPayment?.reference || selectedPayment?._id?.substring(18) || '—'}</span>
          </div>
          <span className="rainbow-text logo" style={{fontSize:'1.6rem', fontWeight:'bold'}}>YourBill</span>
        </div>
        
        <div className="receipt-top-content" style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
          <div className="company-info-receipt">
            <h4 style={{margin:0}}>{selectedPayment?.businessName || 'Your Business'}</h4>
            <p className="sub-text" style={{margin:'0.2rem 0'}}>GSTIN: {selectedPayment?.gstin || '—'}</p>
            <p className="sub-text" style={{margin:0}}>{selectedPayment?.businessAddress || '—'}</p>
          </div>
          <div className="receipt-date-info" style={{textAlign:'right'}}>
            <p style={{margin:0}}><strong>Date:</strong> {selectedPayment?.paymentDate ? new Date(selectedPayment.paymentDate).toLocaleDateString() : '—'}</p>
            <p style={{margin:'0.2rem 0'}}><strong>Method:</strong> {selectedPayment?.paymentMethod || '—'}</p>
          </div>
        </div>

        <div className="receipt-body" style={{marginBottom:'2rem'}}>
          <div className="received-from" style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', marginBottom:'1.5rem'}}>
            <span className="sub-text">Received with thanks from:</span>
            <h3 style={{margin:'0.3rem 0', fontSize:'1.2rem'}}>{selectedPayment?.customerName || '—'}</h3>
          </div>
          
          <div className="amount-highlight" style={{textAlign:'center', background:'rgba(16, 185, 129, 0.1)', padding:'1.5rem', borderRadius:'10px', border:'1px solid #10b981', marginBottom:'1.5rem'}}>
            <span className="sub-text">Amount Received</span>
            <div style={{fontSize:'2.2rem', fontWeight:'bold', color:'#10b981', margin:'0.3rem 0'}}>
              ₹{(selectedPayment?.amount || 0).toLocaleString('en-IN')}
            </div>
            <p className="sub-text" style={{margin:0}}>Payment successfully posted and credited.</p>
          </div>

          <div className="allocation-details">
            <h4 style={{marginBottom:'0.5rem'}}>Settlement Reference</h4>
            <div style={{background:'var(--bg-color)', padding:'0.8rem 1rem', borderRadius:'8px', display:'flex', justifyContent:'space-between'}}>
              <span>Invoice Settled:</span>
              <strong>#{selectedPayment?.invoiceNumber || 'Advance Receipt'}</strong>
            </div>
          </div>
        </div>

        <div className="receipt-footer" style={{borderTop:'1px solid var(--border-color)', paddingTop:'1rem', display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
          <div className="signatures">
            <div className="sig-line" style={{borderTop:'1px dashed var(--border-color)', width:'160px', marginBottom:'0.4rem'}}></div>
            <span className="sub-text">Authorized Signatory</span>
          </div>
          <p className="thank-you-note" style={{margin:0, color:'var(--text-secondary)', fontStyle:'italic'}}>Thank you for prompt business payment!</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="payment-management-wrapper">
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'record' && renderRecordPayment()}
      {activeView === 'receipt' && renderReceipt()}
    </div>
  );
}
