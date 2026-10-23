import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContextValue';
import { AlertTriangle, CheckCircle, Clock, Search, Mail, MessageSquare, Bell, BarChart2, RefreshCw, UploadCloud } from 'lucide-react';
import { customerApi, invoiceApi, paymentApi } from '../api';
import './PaymentTracking.css';

export default function PaymentTracking({ onBack }) {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, reminders, reconciliation
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bankPreview, setBankPreview] = useState([]);
  const [csvError, setCsvError] = useState('');
  const { user } = useContext(AuthContext);
  const currency = user?.businessSettings?.currency || user?.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custList, invList, payList] = await Promise.all([
        customerApi.getAll().catch(() => []),
        invoiceApi.getAll().catch(() => []),
        paymentApi.getAll().catch(() => [])
      ]);

      const now = new Date();

      // Aggregate invoices per customer
      const enrichedCustomers = (custList || []).map(cust => {
        const custInvs = (invList || []).filter(i => i.customerName === cust.name);
        const unpaidInvs = custInvs.filter(i => i.paymentStatus !== 'Paid');
        const totalOutstanding = unpaidInvs.reduce((s, i) => s + (i.balanceAmount ?? i.grandTotal ?? 0), 0);
        
        let overdueAmount = 0;
        let aging0to30 = 0;
        let aging31to60 = 0;
        let aging60plus = 0;

        unpaidInvs.forEach(i => {
          const due = i.dueDate ? new Date(i.dueDate) : (i.date ? new Date(i.date) : now);
          const diffDays = Math.max(0, Math.floor((now - due) / (1000 * 60 * 60 * 24)));
          const amt = i.balanceAmount ?? i.grandTotal ?? 0;

          if (diffDays > 0) overdueAmount += amt;

          if (diffDays <= 30) aging0to30 += amt;
          else if (diffDays <= 60) aging31to60 += amt;
          else aging60plus += amt;
        });

        return {
          id: cust._id,
          name: cust.name,
          phone: cust.phone || '',
          email: cust.email || '',
          totalOutstanding,
          overdueAmount,
          aging: { '0-30': aging0to30, '31-60': aging31to60, '60+': aging60plus },
          risk: overdueAmount > 50000 ? 'High' : overdueAmount > 0 ? 'Medium' : 'Low',
        };
      });

      setCustomers(enrichedCustomers);
      setPayments(payList || []);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const handleSendReminder = (customer, channel = 'WhatsApp') => {
    const company = user?.businessName || user?.shopName || user?.name || 'Your business';
    const text = `Hello ${customer.name}, this is a reminder from ${company} about your pending balance of ${currencySymbol}${customer.totalOutstanding.toLocaleString('en-IN')}. Please contact us to arrange payment. Thank you.`;
    if (channel === 'WhatsApp') {
      if (!customer.phone) { window.alert('Is customer ka phone number saved nahi hai.'); return; }
      const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) { window.alert('Saved phone number valid nahi lag raha. Customer profile update karein.'); return; }
      const url = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!customer.email) { window.alert('Is customer ka email saved nahi hai.'); return; }
    window.open(`mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent('Payment reminder')}&body=${encodeURIComponent(text)}`, '_self');
  };

  const handleBankCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setCsvError('');
    setBankPreview([]);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setCsvError('CSV file 2 MB se chhoti honi chahiye.'); return; }
    try {
      const content = await file.text();
      const rows = content.split(/\r?\n/).filter(Boolean);
      if (rows.length < 2) throw new Error('CSV mein header aur kam se kam ek transaction row honi chahiye.');
      const parseRow = (line) => {
        const cells = []; let cell = ''; let quoted = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch.charCodeAt(0) === 34 && line[i + 1]?.charCodeAt(0) === 34 && quoted) { cell += String.fromCharCode(34); i++; }
          else if (ch.charCodeAt(0) === 34) quoted = !quoted;
          else if (ch === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
          else cell += ch;
        }
        cells.push(cell.trim()); return cells;
      };
      const headers = parseRow(rows[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const findColumn = (...keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const refIdx = findColumn('reference', 'transactionid', 'utr', 'txnid', 'description', 'narration');
      const amountIdx = findColumn('amount', 'credit', 'deposit');
      const dateIdx = findColumn('date', 'valuedate');
      if (refIdx < 0 || amountIdx < 0) throw new Error('CSV mein reference/description aur amount/credit columns nahi mile.');
      const preview = rows.slice(1).map((line, index) => {
        const cells = parseRow(line); const rawAmount = (cells[amountIdx] || '').replace(/[₹,\s]/g, '');
        const amount = Number(rawAmount); const reference = cells[refIdx] || '';
        const match = Number.isFinite(amount) && amount > 0 ? payments.find(pay =>
          Number(pay.amount) === amount && [pay.reference, pay.invoiceNumber].some(value => value && reference.toLowerCase().includes(String(value).toLowerCase()))
        ) : null;
        return { id: index, date: dateIdx >= 0 ? cells[dateIdx] : '', reference, amount, match: match || null };
      }).filter(row => row.reference || Number.isFinite(row.amount));
      setBankPreview(preview);
      if (!preview.length) setCsvError('CSV mein readable transaction rows nahi mile.');
    } catch (error) { setCsvError(error.message || 'CSV read nahi ho saki.'); }
  };

  // Metrics
  const totalOutstanding = customers.reduce((s, c) => s + c.totalOutstanding, 0);
  const totalOverdue = customers.reduce((s, c) => s + c.overdueAmount, 0);
  const overdueCustomersCount = customers.filter(c => c.overdueAmount > 0).length;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  const renderDashboard = () => (
    <div className="track-dashboard fade-in">
      <div className="track-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="track-title">Payment Tracking & Overdue Follow-ups</h2>
          <p className="track-subtitle">Monitor outstanding invoices, due dates, and customer follow-ups</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadData} disabled={loading} style={{display:'flex', alignItems:'center', gap:'0.4rem'}}>
            <RefreshCw size={16} className={loading ? 'spin' : ''}/> Sync
          </button>
          <button className="btn-secondary" onClick={() => setActiveView('reconciliation')}>
            <RefreshCw size={18} /> Auto-Reconciliation
          </button>
          <button className="btn-primary rainbow-bg" onClick={() => setActiveView('reminders')}>
            <Bell size={18} /> Collection Workflows
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-blue"><BarChart2 size={24} /></div>
          <div className="metric-info">
            <h4>Total Outstanding</h4>
            <div className="metric-value">{currencySymbol}{totalOutstanding.toLocaleString('en-IN')}</div>
            <div className="metric-trend">Across {customers.length} client accounts</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-red"><AlertTriangle size={24} /></div>
          <div className="metric-info">
            <h4>Overdue Receivables</h4>
            <div className="metric-value text-red">{currencySymbol}{totalOverdue.toLocaleString('en-IN')}</div>
            <div className="metric-trend negative">{overdueCustomersCount} accounts past due</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><Clock size={24} /></div>
          <div className="metric-info">
            <h4>Current (not overdue)</h4>
            <div className="metric-value text-green">{currencySymbol}{Math.max(0, totalOutstanding - totalOverdue).toLocaleString('en-IN')}</div>
            <div className="metric-trend">Outstanding balance not past due</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-green"><CheckCircle size={24} /></div>
          <div className="metric-info">
            <h4>Settled Payments</h4>
            <div className="metric-value">{payments.length}</div>
            <div className="metric-trend">Payment records in this account</div>
          </div>
        </div>
      </div>

      <div className="track-section">
        <div className="section-header-row">
          <div className="tabs-simple">
            <button className={`tab-simple ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>Outstanding Accounts Ledger</button>
          </div>
          <div className="search-filter">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search customer name or phone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="table-container">
          <table className="track-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Total Pending</th>
                <th>Overdue (Past Due Date)</th>
                <th>Aging (0-30d | 31-60d | 60d+)</th>
                <th>Overdue Risk</th>
                <th>Follow-up Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="clickable-row">
                    <td>
                      <div className="customer-cell">
                        <strong>{cust.name}</strong>
                        <span className="sub-text">{cust.phone || cust.email || 'No contact'}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{currencySymbol}{cust.totalOutstanding.toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <span className={cust.overdueAmount > 0 ? 'text-red font-bold' : 'text-green'}>
                        {currencySymbol}{cust.overdueAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <div className="aging-bar-container">
                        <div className="aging-text" style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'3px'}}>
                          <span>{currencySymbol}{cust.aging['0-30'].toLocaleString('en-IN')}</span>
                          <span>{currencySymbol}{cust.aging['31-60'].toLocaleString('en-IN')}</span>
                          <span>{currencySymbol}{cust.aging['60+'].toLocaleString('en-IN')}</span>
                        </div>
                        <div className="aging-bar" style={{height:'6px', display:'flex', borderRadius:'4px', overflow:'hidden', background:'var(--border-color)'}}>
                          <div className="aging-segment bg-green" style={{flex: cust.aging['0-30'] || 0.1}}></div>
                          <div className="aging-segment bg-orange" style={{flex: cust.aging['31-60'] || 0}}></div>
                          <div className="aging-segment bg-red" style={{flex: cust.aging['60+'] || 0}}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="score-cell">
                        <div className="score-badge">
                          <span>{cust.risk}</span>
                        </div>
                        <span className={`risk-label ${cust.risk.toLowerCase()}`}>{cust.risk} Risk</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-group">
                        <button 
                          className="action-btn text-green" 
                          title="WhatsApp Reminder"
                          onClick={() => handleSendReminder(cust, 'WhatsApp')}
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button 
                          className="action-btn text-blue" 
                          title="Email Reminder"
                          onClick={() => handleSendReminder(cust, 'Email')}
                        >
                          <Mail size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{textAlign:'center', padding:'3rem', color:'var(--text-secondary)'}}>
                    No customers found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReminders = () => {
    const overdueList = customers.filter(c => c.overdueAmount > 0);

    return (
      <div className="reminders-view fade-in">
        <div className="track-header">
          <div>
            <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Tracking</button>
            <h2 className="track-title">Reminder Drafts & Follow-ups</h2>
            <p className="track-subtitle">Review and open individual message drafts for overdue accounts</p>
          </div>
          <div className="header-actions">
            <button className="btn-primary rainbow-bg" onClick={() => window.alert('Bulk sending provider configured nahi hai. Har customer par WhatsApp/Email button se draft kholkar review aur send karein.')}>
              <Mail size={18} /> Bulk Dispatch Reminders
            </button>
          </div>
        </div>

        <div className="workflow-container">
          <div className="workflow-sidebar">
            <h3>Collection Schedule</h3>
            <ul className="workflow-steps">
              <li className="workflow-step">
                <div className="step-marker bg-green"></div>
                <div>
                  <strong>3 Days Before Due</strong>
                  <span className="sub-text">Friendly Email & Statement</span>
                </div>
              </li>
              <li className="workflow-step">
                <div className="step-marker bg-blue"></div>
                <div>
                  <strong>On Due Date</strong>
                  <span className="sub-text">SMS + WhatsApp Notification</span>
                </div>
              </li>
              <li className="workflow-step active">
                <div className="step-marker bg-orange"></div>
                <div>
                  <strong>7 Days Overdue</strong>
                  <span className="sub-text">Formal Overdue Warning</span>
                </div>
              </li>
              <li className="workflow-step">
                <div className="step-marker bg-red"></div>
                <div>
                  <strong>15+ Days Overdue</strong>
                  <span className="sub-text">Direct Call & Account Hold</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="reminder-action-area">
            <div className="action-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
              <h3>Action Required: Overdue Accounts</h3>
              <span className="status-badge danger">{overdueList.length} Customers</span>
            </div>

            {overdueList.length > 0 ? (
              overdueList.map(cust => (
                <div key={cust.id} className="reminder-card" style={{background:'var(--bg-secondary)', padding:'1.5rem', borderRadius:'12px', border:'1px solid var(--border-color)', marginBottom:'1rem'}}>
                  <div className="reminder-header" style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
                    <div className="cust-info">
                      <strong>{cust.name}</strong>
                      <div className="sub-text">Phone: {cust.phone || 'N/A'} • Total Due: {currencySymbol}{cust.totalOutstanding.toLocaleString('en-IN')}</div>
                    </div>
                    <strong className="text-red" style={{fontSize:'1.2rem'}}>{currencySymbol}{cust.overdueAmount.toLocaleString('en-IN')} Overdue</strong>
                  </div>
                  <div className="reminder-body">
                    <p className="sub-text">Credit risk estimate: {cust.risk}. Choose a channel to open a message draft for review.</p>
                    <div className="communication-channels" style={{display:'flex', gap:'0.8rem', marginTop:'0.8rem'}}>
                      <button className="btn-secondary" onClick={() => handleSendReminder(cust, 'Email')}>
                        <Mail size={16} /> Send Email Notice
                      </button>
                      <button className="btn-primary" style={{background:'#25D366', color:'#fff', border:'none'}} onClick={() => handleSendReminder(cust, 'WhatsApp')}>
                        <MessageSquare size={16} /> WhatsApp Pay Link
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{background:'var(--bg-secondary)', padding:'3rem', borderRadius:'12px', textAlign:'center', color:'var(--text-secondary)'}}>
                <CheckCircle size={36} color="#10b981" style={{margin:'0 auto 1rem auto'}}/>
                <strong>All Accounts Settled On Schedule!</strong>
                <p className="sub-text mt-2">There are currently no accounts with overdue invoices.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReconciliation = () => (
    <div className="recon-view fade-in">
      <div className="track-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Dashboard</button>
          <h2 className="track-title">Automated Bank Reconciliation</h2>
          <p className="track-subtitle">Preview CSV transactions against saved payments. Suggested matches need your review.</p>
        </div>
        <div className="header-actions">
          <label className="btn-secondary" style={{cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'0.4rem'}}>
            <UploadCloud size={18} /> Upload Bank CSV
            <input type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={handleBankCsv}/>
          </label>
          <button className="btn-primary rainbow-bg" onClick={() => setBankPreview(rows => rows.map(row => ({ ...row, match: payments.find(pay => Number(pay.amount) === row.amount && [pay.reference, pay.invoiceNumber].some(value => value && row.reference.toLowerCase().includes(String(value).toLowerCase()))) || null })))} disabled={!bankPreview.length}>
            <RefreshCw size={18} /> Run Auto-Match
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Live Recorded Payments</h4>
            <div className="metric-value text-green">{payments.length}</div>
            <div className="metric-trend positive">From system database</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-info">
            <h4>Exact Match Rate</h4>
            <div className="metric-value text-blue">{bankPreview.length ? `${Math.round((bankPreview.filter(row => row.match).length / bankPreview.length) * 100)}%` : '—'}</div>
            <div className="metric-trend">Exact reference and amount matches in uploaded CSV</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-info">
            <h4>Pending Allocation</h4>
            <div className="metric-value text-orange">{bankPreview.filter(row => !row.match).length}</div>
            <div className="metric-trend">CSV rows without an exact match</div>
          </div>
        </div>
      </div>

      <div className="table-container mt-4">
        <table className="track-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction Reference</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bankPreview.length ? bankPreview.slice(0, 100).map(row => (
              <tr key={`csv-${row.id}`}><td>{row.date || '—'}</td><td><strong>{row.reference}</strong></td><td>{row.match?.customerName || 'Unmatched'}</td><td><strong>{Number.isFinite(row.amount) ? `${currencySymbol}${row.amount.toLocaleString('en-IN')}` : 'Invalid amount'}</strong></td><td><span className={`status-badge ${row.match ? 'success' : 'danger'}`}>{row.match ? `Review match: ${row.match.invoiceNumber}` : 'Needs review'}</span></td></tr>
            )) : payments.slice(0, 8).map((pay, idx) => (
              <tr key={pay._id || idx}>
                <td>{pay.paymentDate || pay.createdAt ? new Date(pay.paymentDate || pay.createdAt).toLocaleDateString() : '—'}</td>
                <td><strong>{pay.reference || `TXN-${pay._id?.substring(18) || idx}`}</strong></td>
                <td>{pay.customerName || 'Customer'}</td>
                <td><strong>{currencySymbol}{(pay.amount || 0).toLocaleString('en-IN')}</strong></td>
                <td>
                  <span className={`status-badge ${pay.status === 'Completed' ? 'success' : 'danger'}`}>
                    {pay.status || 'Unknown'} · {pay.invoiceNumber || 'Direct payment'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {csvError && <p role="alert" className="text-red" style={{padding:'0.75rem 1rem'}}>{csvError}</p>}
      {bankPreview.length > 0 && <p className="sub-text" style={{padding:'0.75rem 1rem'}}>Showing {Math.min(bankPreview.length, 100)} of {bankPreview.length} parsed rows. Matches are suggestions only; no payment or invoice records were changed.</p>}
    </div>
  );

  return (
    <div className="payment-tracking-wrapper">
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'reminders' && renderReminders()}
      {activeView === 'reconciliation' && renderReconciliation()}
    </div>
  );
}
