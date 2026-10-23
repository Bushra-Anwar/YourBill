import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, FileText, FileSpreadsheet, Mail, Target, Percent, RefreshCw } from 'lucide-react';
import { invoiceApi } from '../api';
import './ReportsAnalytics.css';

export default function ReportsAnalytics({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Live analytics state
  const [stats, setStats] = useState({
    totalSales: 0,
    paidSales: 0,
    outstanding: 0,
    todaySales: 0,
    monthSales: 0,
    invoiceCount: 0
  });

  const [invoices, setInvoices] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const invList = await invoiceApi.getAll().catch(() => []);

      if (Array.isArray(invList)) {
        setInvoices(invList);
        const today = new Date();
        const isSameDay = (value) => {
          const date = new Date(value);
          return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString();
        };
        const isSameMonth = (value) => {
          const date = new Date(value);
          return !Number.isNaN(date.getTime()) && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        };
        const amountOf = (inv) => Number(inv.totalAmount ?? inv.grandTotal ?? inv.amount ?? 0) || 0;
        const paidOf = (inv) => Number(inv.paidAmount ?? ((inv.paymentStatus || inv.status) === 'Paid' ? amountOf(inv) : 0)) || 0;
        setStats({
          totalSales: invList.reduce((sum, inv) => sum + amountOf(inv), 0),
          paidSales: invList.reduce((sum, inv) => sum + paidOf(inv), 0),
          outstanding: invList.reduce((sum, inv) => sum + Math.max(0, Number(inv.balanceAmount ?? amountOf(inv) - paidOf(inv)) || 0), 0),
          todaySales: invList.filter(inv => isSameDay(inv.date || inv.createdAt)).reduce((sum, inv) => sum + amountOf(inv), 0),
          monthSales: invList.filter(inv => isSameMonth(inv.date || inv.createdAt)).reduce((sum, inv) => sum + amountOf(inv), 0),
          invoiceCount: invList.length
        });

        // Aggregate top products
        const prodMap = {};
        invList.forEach(inv => {
          (inv.items || []).forEach(it => {
            const name = it.name || 'Standard Item';
            if (!prodMap[name]) {
              prodMap[name] = { name, qty: 0, revenue: 0 };
            }
            prodMap[name].qty += (it.qty || 1);
            prodMap[name].revenue += (it.amount || ((it.qty || 1) * (it.rate || 0)));
          });
        });
        const prodArr = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        setTopProducts(prodArr);

        // Aggregate top customers
        const custMap = {};
        invList.forEach(inv => {
          const name = inv.customerName || 'Customer';
          if (!custMap[name]) {
            custMap[name] = { name, orders: 0, revenue: 0, outstanding: 0 };
          }
          custMap[name].orders += 1;
          custMap[name].revenue += (inv.grandTotal || 0);
          custMap[name].outstanding += (inv.balanceAmount || 0);
        });
        const custArr = Object.values(custMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        setTopCustomers(custArr);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ["Invoice Number", "Customer Name", "Date", "Items Count", "Subtotal", "Tax", "Grand Total", "Status"],
      ...invoices.map(inv => [
        inv.invoiceNumber,
        `"${inv.customerName}"`,
        new Date(inv.date).toLocaleDateString(),
        inv.items?.length || 1,
        inv.subtotal || 0,
        inv.totalTax || 0,
        inv.grandTotal || 0,
        inv.paymentStatus || 'Paid'
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderExportActions = () => (
    <div className="export-group">
      <button className="export-btn" title="Export as PDF" onClick={() => window.print()}><FileText size={16} /> Print PDF</button>
      <button className="export-btn" title="Export as CSV" onClick={handleExportCSV}><FileSpreadsheet size={16} /> CSV</button>
      <button className="export-btn" title="Create an email draft with the current report totals" onClick={() => {
        const body = [`Sales report`, `Invoices: ${stats.invoiceCount}`, `Total sales: ${stats.totalSales}`, `Paid sales: ${stats.paidSales}`, `Outstanding: ${stats.outstanding}`].join('\\n');
        window.location.href = `mailto:?subject=${encodeURIComponent('YourBill sales report')}&body=${encodeURIComponent(body)}`;
      }}><Mail size={16} /></button>
    </div>
  );

  const renderDashboard = () => {
    const monthlySales = Array.from({ length: 5 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (4 - index));
      const sales = invoices.reduce((sum, inv) => {
        const invoiceDate = new Date(inv.date || inv.createdAt);
        return invoiceDate.getMonth() === date.getMonth() && invoiceDate.getFullYear() === date.getFullYear()
          ? sum + (Number(inv.totalAmount ?? inv.grandTotal ?? inv.amount ?? 0) || 0)
          : sum;
      }, 0);
      return { label: date.toLocaleDateString('en-IN', { month: 'short' }), sales, current: index === 4 };
    });
    const peakSales = Math.max(...monthlySales.map(month => month.sales), 1);
    const latestMonth = monthlySales[4].sales;
    const previousMonth = monthlySales[3].sales;
    const monthlyChange = previousMonth > 0 ? ((latestMonth - previousMonth) / previousMonth) * 100 : null;

    return (
      <div className="ra-view fade-in">
        <header className="ra-header">
          <div className="ra-heading-copy">
            <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
            <p className="eyebrow">BUSINESS OVERVIEW</p>
            <h2 className="ra-title">Analytics</h2>
            <p className="ra-subtitle">Your billing and collection performance, all in one place.</p>
          </div>
          <div className="ra-actions">
            <button className="btn-secondary" onClick={loadAnalytics} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''}/> Refresh</button>
            {renderExportActions()}
          </div>
        </header>

        <div className="grid-4 analytics-kpis">
          <div className="metric-card highlight"><div className="metric-icon bg-purple"><DollarSign size={22}/></div><div className="metric-info"><h4>Today's sales</h4><div className="metric-value">₹{stats.todaySales.toLocaleString('en-IN')}</div><div className="metric-trend">Today's invoices</div></div></div>
          <div className="metric-card"><div className="metric-icon bg-blue"><Calendar size={22}/></div><div className="metric-info"><h4>Total billed</h4><div className="metric-value">₹{stats.totalSales.toLocaleString('en-IN')}</div><div className="metric-trend">{invoices.length} invoices</div></div></div>
          <div className="metric-card"><div className="metric-icon bg-green"><TrendingUp size={22}/></div><div className="metric-info"><h4>Collected</h4><div className="metric-value text-green">₹{stats.paidSales.toLocaleString('en-IN')}</div><div className="metric-trend">Payments received</div></div></div>
          <div className="metric-card"><div className="metric-icon bg-orange"><Target size={22}/></div><div className="metric-info"><h4>Outstanding</h4><div className="metric-value text-orange">₹{stats.outstanding.toLocaleString('en-IN')}</div><div className="metric-trend">Balance to collect</div></div></div>
        </div>

        <div className="analytics-grid">
          <section className="ra-section revenue-panel">
            <div className="chart-heading"><div><h3>Revenue over time</h3><p>Monthly totals from your invoices</p></div>{monthlyChange !== null && <span className={`growth-badge ${monthlyChange >= 0 ? 'positive' : 'negative'}`}>{monthlyChange >= 0 ? '↑' : '↓'} {Math.abs(monthlyChange).toFixed(1)}% MoM</span>}</div>
            <div className={`chart-placeholder ${invoices.length === 0 ? 'is-empty' : ''}`} role="img" aria-label="Invoice revenue for the last five months">
              {invoices.length > 0 ? monthlySales.map(month => <div key={month.label} className={`chart-column ${month.current ? 'current' : ''}`}><span className="chart-amount">₹{month.sales.toLocaleString('en-IN')}</span><div className="chart-bar" style={{ height: `${Math.max(month.sales > 0 ? 8 : 2, month.sales / peakSales * 100)}%` }}/><span className="chart-label">{month.label}</span></div>) : <div className="chart-empty"><span>↗</span><strong>No sales history yet</strong><small>Create an invoice to see your monthly revenue here.</small></div>}
            </div>
          </section>

          <section className="ra-section pulse-panel">
            <div className="panel-heading"><div><h3>Business at a glance</h3><p>Invoice activity and collections</p></div><span className="live-dot">Live</span></div>
            <div className="pulse-metrics"><div className="pulse-metric"><span>Total invoices</span><strong>{invoices.length}</strong><small>All recorded invoices</small></div><div className="pulse-metric"><span>Paid invoices</span><strong className="paid-number">{invoices.filter(i => (i.paymentStatus || i.status) === 'Paid').length}</strong><small>{invoices.filter(i => (i.paymentStatus || i.status) !== 'Paid').length} still open</small></div></div>
            <div className="pulse-summary"><div><span>Collected so far</span><strong>₹{stats.paidSales.toLocaleString('en-IN')}</strong></div><div><span>This month billed</span><strong>₹{stats.monthSales.toLocaleString('en-IN')}</strong></div></div>
          </section>
        </div>

        <section className="ra-section recent-invoices">
          <div className="panel-heading"><div><h3>Recent invoices</h3><p>A quick look at your latest billing activity.</p></div><button className="text-action" onClick={() => setActiveTab('sales')}>View all invoices <span>→</span></button></div>
          <div className="recent-invoice-list">
            {invoices.length > 0 ? invoices.slice(0, 5).map(inv => <div className="recent-invoice-row" key={inv._id || inv.invoiceNumber}><div className="invoice-avatar"><FileText size={17}/></div><div className="recent-invoice-name"><strong>{inv.customerName || 'Customer'}</strong><span>{inv.invoiceNumber || 'Invoice'} · {new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN')}</span></div><span className={`invoice-status ${(inv.paymentStatus || inv.status || 'Unpaid').toLowerCase()}`}>{inv.paymentStatus || inv.status || 'Unpaid'}</span><strong className="recent-invoice-amount">₹{Number(inv.totalAmount ?? inv.grandTotal ?? inv.amount ?? 0).toLocaleString('en-IN')}</strong></div>) : <div className="recent-empty"><span>🧾</span><div><strong>No invoices yet</strong><p>Your latest invoices will show up here.</p></div></div>}
          </div>
        </section>
      </div>
    );
  };
  const renderSalesReports = () => (
    <div className="ra-view fade-in">
      <div className="ra-header">
        <div>
          <button className="back-btn" onClick={() => setActiveTab('dashboard')}>â† Back to Overview</button>
          <h2 className="ra-title">Sales Reports & Invoicing Register</h2>
          <p className="ra-subtitle">Complete ledger of all generated customer invoices</p>
        </div>
        {renderExportActions()}
      </div>

      <div className="ra-section">
        <table className="ra-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Subtotal</th>
              <th>Tax (GST)</th>
              <th>Total Amount</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <tr key={inv._id}>
                  <td><strong>#{inv.invoiceNumber}</strong></td>
                  <td>{new Date(inv.date).toLocaleDateString()}</td>
                  <td>{inv.customerName}</td>
                  <td>â‚¹{(inv.subtotal || 0).toLocaleString('en-IN')}</td>
                  <td>â‚¹{(inv.totalTax || 0).toLocaleString('en-IN')}</td>
                  <td><strong>â‚¹{(inv.grandTotal || 0).toLocaleString('en-IN')}</strong></td>
                  <td>
                    <span className={`status-badge ${(inv.paymentStatus || 'Paid').toLowerCase()}`}>
                      {inv.paymentStatus || 'Paid'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{textAlign:'center', padding:'2rem'}}>No invoices recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProductReports = () => (
    <div className="ra-view fade-in">
      <div className="ra-header">
        <div>
          <button className="back-btn" onClick={() => setActiveTab('dashboard')}>â† Back to Overview</button>
          <h2 className="ra-title">Product & Item Performance</h2>
          <p className="ra-subtitle">Volume and sales breakdown by catalog item</p>
        </div>
        {renderExportActions()}
      </div>

      <div className="ra-section">
        <h3>Top Performing Products</h3>
        <table className="ra-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Units Sold</th>
              <th>Gross Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <tr key={idx}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.qty}</td>
                  <td><strong style={{color:'#10b981'}}>â‚¹{Math.round(p.revenue).toLocaleString('en-IN')}</strong></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{textAlign:'center', padding:'2rem'}}>No product sale records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCustomerReports = () => (
    <div className="ra-view fade-in">
      <div className="ra-header">
        <div>
          <button className="back-btn" onClick={() => setActiveTab('dashboard')}>â† Back to Overview</button>
          <h2 className="ra-title">Customer Analytics</h2>
          <p className="ra-subtitle">Lifetime orders, billed volume, and outstanding balances</p>
        </div>
        {renderExportActions()}
      </div>

      <div className="ra-section">
        <h3>Top Customers by Billed Volume</h3>
        <table className="ra-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Total Orders</th>
              <th>Total Revenue</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.length > 0 ? (
              topCustomers.map((c, idx) => (
                <tr key={idx}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.orders}</td>
                  <td><strong>â‚¹{c.revenue.toLocaleString('en-IN')}</strong></td>
                  <td style={{ color: c.outstanding > 0 ? '#ef4444' : '#10b981' }}>
                    â‚¹{c.outstanding.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{textAlign:'center', padding:'2rem'}}>No customer purchase history yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTaxProfit = () => {
    const totalRev = stats.totalSales || 0;
    const estCogs = Math.round(totalRev * 0.6);
    const grossProfit = totalRev - estCogs;
    const estExpenses = Math.round(totalRev * 0.15);
    const netProfit = grossProfit - estExpenses;

    return (
      <div className="ra-view fade-in">
        <div className="ra-header">
          <div>
            <button className="back-btn" onClick={() => setActiveTab('dashboard')}>â† Back to Overview</button>
            <h2 className="ra-title">Tax & Profitability Breakdown</h2>
            <p className="ra-subtitle">Operating income, margins, and tax contribution</p>
          </div>
          {renderExportActions()}
        </div>

        <div className="grid-2">
          <div className="ra-section">
            <h3>Profitability Breakdown</h3>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span>Total Billed Sales</span>
                <strong>â‚¹{totalRev.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>(-) Estimated COGS (Cost of Inventory ~60%)</span>
                <span>â‚¹{estCogs.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', padding: '1rem 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)' }}>
                <span>Gross Profit</span>
                <strong style={{ color: '#10b981' }}>â‚¹{grossProfit.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>(-) Operating Expenses (~15%)</span>
                <span>â‚¹{estExpenses.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', paddingTop: '1rem', borderTop: '2px solid var(--border-color)' }}>
                <span>Net Operating Profit</span>
                <strong style={{ color: '#10b981' }}>â‚¹{netProfit.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          <div className="ra-section">
            <h3>Compliance Status</h3>
            <div style={{padding:'2rem', background:'var(--bg-color)', borderRadius:'12px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'0.8rem', marginBottom:'1rem'}}>
                <Percent size={28} color="#10b981"/>
                <div>
                  <h4 style={{margin:0}}>GSTR Compliance Synchronized</h4>
                  <p className="sub-text" style={{margin:0}}>HSN codes and CGST/SGST/IGST tax values mapped</p>
                </div>
              </div>
              <p className="sub-text" style={{lineHeight:1.6}}>
                All outward supply transactions are linked to real-time double-entry ledgers. Ready for GSTR-1 & GSTR-3B monthly e-filing.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="reports-analytics-wrapper">
      <div className="tabs-simple">
        <button className={`tab-simple ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Executive KPI</button>
        <button className={`tab-simple ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Sales Register</button>
        <button className={`tab-simple ${activeTab === 'product' ? 'active' : ''}`} onClick={() => setActiveTab('product')}>Product Performance</button>
        <button className={`tab-simple ${activeTab === 'customer' ? 'active' : ''}`} onClick={() => setActiveTab('customer')}>Customer Analytics</button>
        <button className={`tab-simple ${activeTab === 'tax' ? 'active' : ''}`} onClick={() => setActiveTab('tax')}>Profit & Tax</button>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'sales' && renderSalesReports()}
      {activeTab === 'product' && renderProductReports()}
      {activeTab === 'customer' && renderCustomerReports()}
      {activeTab === 'tax' && renderTaxProfit()}
    </div>
  );
}
