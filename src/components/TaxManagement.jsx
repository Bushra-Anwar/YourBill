import { useState, useEffect } from 'react';
import { Percent, FileText, Download, Plus, Settings, AlertTriangle, ShieldCheck, PieChart, Briefcase, RefreshCw } from 'lucide-react';
import { taxApi } from '../api';
import './TaxManagement.css';

const DEFAULT_TAX_RATES = [
  { id: 'TX-001', name: 'GST 18%', type: 'GST', rate: 18, breakdown: 'CGST 9% + SGST 9%', status: 'Active' },
  { id: 'TX-002', name: 'IGST 18%', type: 'IGST', rate: 18, breakdown: 'IGST 18%', status: 'Active' },
  { id: 'TX-003', name: 'GST 12%', type: 'GST', rate: 12, breakdown: 'CGST 6% + SGST 6%', status: 'Active' },
  { id: 'TX-004', name: 'GST 5%', type: 'GST', rate: 5, breakdown: 'CGST 2.5% + SGST 2.5%', status: 'Active' },
  { id: 'TX-005', name: 'Exempt 0%', type: 'Exempt', rate: 0, breakdown: '0%', status: 'Active' },
];

const DEFAULT_HSN_CODES = [
  { code: '998311', desc: 'IT Services & Consulting', type: 'SAC', defaultRate: 'GST 18%' },
  { code: '847130', desc: 'Laptops & Portable Computers', type: 'HSN', defaultRate: 'GST 18%' },
  { code: '940330', desc: 'Office Furniture & Chairs', type: 'HSN', defaultRate: 'GST 18%' },
  { code: '844331', desc: 'Thermal & POS Printers', type: 'HSN', defaultRate: 'GST 18%' },
];

export default function TaxManagement({ onBack }) {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, rates, hsn, returns
  const [loading, setLoading] = useState(false);
  const [taxRates, setTaxRates] = useState(DEFAULT_TAX_RATES);
  const [hsnCodes, setHsnCodes] = useState(DEFAULT_HSN_CODES);
  
  const [summary, setSummary] = useState({
    totalTaxableValue: 0,
    totalOutputTax: 0,
    outputCgst: 0,
    outputSgst: 0,
    outputIgst: 0,
    inputTaxCredit: 0,
    netTaxPayable: 0,
    b2b: { count: 0, total: 0, tax: 0 },
    b2c: { count: 0, total: 0, tax: 0 },
    hsnSummary: []
  });

  // Modal states
  const [showAddRateModal, setShowAddRateModal] = useState(false);
  const [newRateForm, setNewRateForm] = useState({ name: '', type: 'GST', rate: 18, breakdown: 'CGST 9% + SGST 9%' });

  const [showAddHsnModal, setShowAddHsnModal] = useState(false);
  const [newHsnForm, setNewHsnForm] = useState({ code: '', desc: '', type: 'HSN', defaultRate: 'GST 18%' });

  useEffect(() => {
    fetchTaxSummary();
  }, []);

  async function fetchTaxSummary() {
    setLoading(true);
    try {
      const data = await taxApi.getSummary();
      if (data) {
        setSummary(data);
        if (data.taxRates && data.taxRates.length > 0) {
          setTaxRates(data.taxRates);
        }
      }
    } catch (err) {
      console.error('Failed to load tax summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadGSTR1Json = () => {
    const gstr1Payload = {
      gstin: "27AABCV1234F1Z5",
      fp: "032026",
      version: "GST3.0.0",
      hash: "hash_token_verified",
      b2b: [
        {
          inv_count: summary.b2b?.count || 0,
          val: summary.b2b?.total || 0,
          tax: summary.b2b?.tax || 0
        }
      ],
      b2c: [
        {
          inv_count: summary.b2c?.count || 0,
          val: summary.b2c?.total || 0,
          tax: summary.b2c?.tax || 0
        }
      ],
      hsn: {
        data: summary.hsnSummary || []
      }
    };

    const blob = new Blob([JSON.stringify(gstr1Payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR-1_March_2026.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGSTR3BJson = () => {
    const gstr3bPayload = {
      period: "03-2026",
      taxableAmount: summary.totalTaxableValue,
      outwardTax: summary.totalOutputTax,
      itcEligible: summary.inputTaxCredit,
      netPayable: summary.netTaxPayable,
      cgst: summary.outputCgst,
      sgst: summary.outputSgst,
      igst: summary.outputIgst
    };

    const blob = new Blob([JSON.stringify(gstr3bPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR-3B_Summary_March_2026.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddTaxRate = (e) => {
    e.preventDefault();
    if (!newRateForm.name || !newRateForm.rate) return;
    const newRate = {
      id: `TX-00${taxRates.length + 1}`,
      name: newRateForm.name,
      type: newRateForm.type,
      rate: parseFloat(newRateForm.rate),
      breakdown: newRateForm.breakdown || `${newRateForm.rate}%`,
      status: 'Active'
    };
    setTaxRates([...taxRates, newRate]);
    setShowAddRateModal(false);
    setNewRateForm({ name: '', type: 'GST', rate: 18, breakdown: 'CGST 9% + SGST 9%' });
  };

  const handleAddHsn = (e) => {
    e.preventDefault();
    if (!newHsnForm.code || !newHsnForm.desc) return;
    setHsnCodes([...hsnCodes, newHsnForm]);
    setShowAddHsnModal(false);
    setNewHsnForm({ code: '', desc: '', type: 'HSN', defaultRate: 'GST 18%' });
  };

  const renderDashboard = () => (
    <div className="tax-dashboard fade-in">
      <div className="tax-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="tax-title">Tax Management & Compliance</h2>
          <p className="tax-subtitle">Real-time GST, CGST/SGST/IGST liability and GSTR filing ready</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchTaxSummary} disabled={loading} style={{display:'flex', alignItems:'center', gap:'0.4rem'}}>
            <RefreshCw size={16} className={loading ? 'spin' : ''}/> Refresh Metrics
          </button>
          <button className="btn-secondary" onClick={() => setActiveView('rates')}><Settings size={18} /> Tax Settings</button>
          <button className="btn-primary rainbow-bg" onClick={() => setActiveView('returns')}>
            <FileText size={18} /> GSTR Returns
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-green"><Percent size={24} /></div>
          <div className="metric-info">
            <h4>Output Tax (Collected)</h4>
            <div className="metric-value">₹{(summary.totalOutputTax || 0).toLocaleString('en-IN')}</div>
            <div className="metric-trend positive">From live invoice sales</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><Briefcase size={24} /></div>
          <div className="metric-info">
            <h4>Input Tax Credit (ITC)</h4>
            <div className="metric-value">₹{(summary.inputTaxCredit || 0).toLocaleString('en-IN')}</div>
            <div className="metric-trend">Claimable from purchases</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-blue"><PieChart size={24} /></div>
          <div className="metric-info">
            <h4>Net Tax Payable</h4>
            <div className="metric-value text-blue">₹{(summary.netTaxPayable || 0).toLocaleString('en-IN')}</div>
            <div className="metric-trend">Output Tax - Eligible ITC</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-red"><AlertTriangle size={24} /></div>
          <div className="metric-info">
            <h4>B2B Active Portals</h4>
            <div className="metric-value text-purple">{summary.b2b?.count || 0}</div>
            <div className="metric-trend positive">GSTIN Verified Accounts</div>
          </div>
        </div>
      </div>

      <div className="tax-section">
        <div className="section-header-row">
          <div className="tabs-simple">
            <button className="tab-simple active">Tax Liability Overview</button>
          </div>
          <div className="search-filter">
            <button className="btn-secondary" onClick={handleDownloadGSTR1Json}>
              <Download size={18} /> Export GSTR JSON
            </button>
          </div>
        </div>
        
        <div className="table-container">
          <table className="tax-table">
            <thead>
              <tr>
                <th>Tax Head</th>
                <th>Collected (Output)</th>
                <th>Paid (Input / ITC)</th>
                <th>Net Payable</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>CGST (Central Tax)</strong></td>
                <td className="text-green">₹{(summary.outputCgst || 0).toLocaleString('en-IN')}</td>
                <td className="text-orange">₹{Math.round((summary.inputTaxCredit || 0) / 2).toLocaleString('en-IN')}</td>
                <td><strong>₹{Math.max(0, Math.round((summary.outputCgst || 0) - (summary.inputTaxCredit || 0) / 2)).toLocaleString('en-IN')}</strong></td>
              </tr>
              <tr>
                <td><strong>SGST (State Tax)</strong></td>
                <td className="text-green">₹{(summary.outputSgst || 0).toLocaleString('en-IN')}</td>
                <td className="text-orange">₹{Math.round((summary.inputTaxCredit || 0) / 2).toLocaleString('en-IN')}</td>
                <td><strong>₹{Math.max(0, Math.round((summary.outputSgst || 0) - (summary.inputTaxCredit || 0) / 2)).toLocaleString('en-IN')}</strong></td>
              </tr>
              <tr>
                <td><strong>IGST (Integrated Tax)</strong></td>
                <td className="text-green">₹{(summary.outputIgst || 0).toLocaleString('en-IN')}</td>
                <td className="text-orange">₹0</td>
                <td><strong>₹{(summary.outputIgst || 0).toLocaleString('en-IN')}</strong></td>
              </tr>
              <tr className="total-row">
                <td><strong>Total Combined GST</strong></td>
                <td className="text-green"><strong>₹{(summary.totalOutputTax || 0).toLocaleString('en-IN')}</strong></td>
                <td className="text-orange"><strong>₹{(summary.inputTaxCredit || 0).toLocaleString('en-IN')}</strong></td>
                <td className="rainbow-text"><strong>₹{(summary.netTaxPayable || 0).toLocaleString('en-IN')}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {summary.hsnSummary && summary.hsnSummary.length > 0 && (
        <div className="tax-section" style={{marginTop:'2rem'}}>
          <h3>Live HSN / SAC Sales Summary</h3>
          <p className="sub-text" style={{marginBottom:'1rem'}}>Aggregated from billed items across current ledger</p>
          <div className="table-container">
            <table className="tax-table">
              <thead>
                <tr>
                  <th>HSN/SAC Code</th>
                  <th>Description</th>
                  <th>Total Qty</th>
                  <th>Taxable Value</th>
                  <th>Tax Rate</th>
                  <th>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {summary.hsnSummary.map((hsn, idx) => (
                  <tr key={idx}>
                    <td><strong>{hsn.code}</strong></td>
                    <td>{hsn.description}</td>
                    <td>{hsn.totalQty}</td>
                    <td>₹{Math.round(hsn.taxableValue).toLocaleString('en-IN')}</td>
                    <td><span className="badge-highlight">{hsn.taxRate}%</span></td>
                    <td className="text-green">₹{Math.round(hsn.totalTax).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderRates = () => (
    <div className="tax-rates-view fade-in">
      <div className="tax-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Tax Dashboard</button>
          <h2 className="tax-title">Tax Rates & HSN Codes</h2>
          <p className="tax-subtitle">Configure GST/VAT percentages and intra/inter-state rules</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setActiveView('hsn')}><Briefcase size={18} /> Manage HSN/SAC</button>
          <button className="btn-primary rainbow-bg" onClick={() => setShowAddRateModal(true)}><Plus size={18} /> Add Tax Rate</button>
        </div>
      </div>

      <div className="tax-form-layout">
        <div className="tax-form-main">
          <div className="table-container">
            <table className="tax-table">
              <thead>
                <tr>
                  <th>Tax Name</th>
                  <th>Type</th>
                  <th>Total Rate (%)</th>
                  <th>Breakdown</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {taxRates.map(rate => (
                  <tr key={rate.id}>
                    <td><strong>{rate.name}</strong></td>
                    <td><span className="type-badge">{rate.type}</span></td>
                    <td>{rate.rate}%</td>
                    <td><span className="sub-text">{rate.breakdown}</span></td>
                    <td>
                      <span className={`status-badge ${(rate.status || 'Active').toLowerCase()}`}>{rate.status || 'Active'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tax-form-sidebar">
          <div className="info-card">
            <h3><ShieldCheck size={18} /> Real-World GST Rules</h3>
            <p className="sub-text mt-2">The system automatically calculates taxes according to GST compliance guidelines:</p>
            <ul className="info-list mt-3">
              <li><strong>Intra-State:</strong> Place of supply is within your home state. Applies <strong>CGST (50%) + SGST (50%)</strong>.</li>
              <li><strong>Inter-State:</strong> Place of supply is outside your state. Applies <strong>IGST (100%)</strong>.</li>
              <li><strong>Input Tax Credit:</strong> Recorded automatically from verified vendor expenses and purchase bills.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHSN = () => (
    <div className="tax-rates-view fade-in">
      <div className="tax-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('rates')}>← Back to Tax Rates</button>
          <h2 className="tax-title">HSN / SAC Master Catalog</h2>
          <p className="tax-subtitle">Standardized classification codes for products and services</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary rainbow-bg" onClick={() => setShowAddHsnModal(true)}><Plus size={18} /> Add Code</button>
        </div>
      </div>

      <div className="table-container">
        <table className="tax-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Description</th>
              <th>Default Tax Rate</th>
            </tr>
          </thead>
          <tbody>
            {hsnCodes.map((code, idx) => (
              <tr key={idx}>
                <td><strong>{code.code}</strong></td>
                <td><span className="type-badge">{code.type}</span></td>
                <td>{code.desc}</td>
                <td><span className="badge-highlight">{code.defaultRate}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReturns = () => (
    <div className="tax-returns-view fade-in">
      <div className="tax-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Tax Dashboard</button>
          <h2 className="tax-title">Government Compliance Returns</h2>
          <p className="tax-subtitle">One-click generate official GSTR-1 and GSTR-3B filing packages</p>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon bg-blue"><FileText size={32} /></div>
          <h3>GSTR-1 (Outward Supplies)</h3>
          <p className="sub-text">B2B and B2C sales details, invoice table, and HSN summary.</p>
          <div className="report-stats">
            <div><span>B2B Invoices:</span> <strong>{summary.b2b?.count || 0}</strong></div>
            <div><span>B2C Invoices:</span> <strong>{summary.b2c?.count || 0}</strong></div>
            <div><span>Total Tax Collected:</span> <strong>₹{(summary.totalOutputTax || 0).toLocaleString('en-IN')}</strong></div>
          </div>
          <div className="report-actions">
            <button className="btn-primary rainbow-bg" onClick={handleDownloadGSTR1Json}>
              <Download size={16} /> Download JSON for GST Portal
            </button>
          </div>
        </div>

        <div className="report-card">
          <div className="report-icon bg-orange"><FileText size={32} /></div>
          <h3>GSTR-3B (Monthly Summary Return)</h3>
          <p className="sub-text">Consolidated self-declaration of tax liability and ITC availed.</p>
          <div className="report-stats">
            <div><span>Output Tax:</span> <strong>₹{(summary.totalOutputTax || 0).toLocaleString('en-IN')}</strong></div>
            <div><span>Eligible ITC:</span> <strong>₹{(summary.inputTaxCredit || 0).toLocaleString('en-IN')}</strong></div>
            <div><span>Net Payable:</span> <strong>₹{(summary.netTaxPayable || 0).toLocaleString('en-IN')}</strong></div>
          </div>
          <div className="report-actions">
            <button className="btn-primary rainbow-bg" onClick={handleDownloadGSTR3BJson}>
              <Download size={16} /> Download GSTR-3B Summary JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="tax-management-wrapper">
      <div className="tax-content-layer">
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'rates' && renderRates()}
        {activeView === 'hsn' && renderHSN()}
        {activeView === 'returns' && renderReturns()}
      </div>

      {/* Add Tax Rate Modal */}
      {showAddRateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{maxWidth:'450px'}}>
            <div className="modal-header">
              <h3>Add New Tax Rate</h3>
              <button className="close-btn" onClick={() => setShowAddRateModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddTaxRate} style={{display:'flex', flexDirection:'column', gap:'1rem', marginTop:'1rem'}}>
              <div>
                <label className="sub-text">Tax Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. GST 28%"
                  value={newRateForm.name}
                  onChange={(e) => setNewRateForm({...newRateForm, name: e.target.value})}
                  className="large-input"
                />
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div>
                  <label className="sub-text">Type</label>
                  <select 
                    value={newRateForm.type}
                    onChange={(e) => setNewRateForm({...newRateForm, type: e.target.value})}
                    className="large-select"
                  >
                    <option value="GST">GST</option>
                    <option value="IGST">IGST</option>
                    <option value="VAT">VAT</option>
                    <option value="Exempt">Exempt</option>
                  </select>
                </div>
                <div>
                  <label className="sub-text">Rate (%)</label>
                  <input 
                    type="number"
                    required
                    value={newRateForm.rate}
                    onChange={(e) => setNewRateForm({...newRateForm, rate: e.target.value})}
                    className="large-input"
                  />
                </div>
              </div>
              <div>
                <label className="sub-text">Breakdown Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. CGST 14% + SGST 14%"
                  value={newRateForm.breakdown}
                  onChange={(e) => setNewRateForm({...newRateForm, breakdown: e.target.value})}
                  className="large-input"
                />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:'0.8rem', marginTop:'1rem'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddRateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary rainbow-bg">Add Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add HSN Modal */}
      {showAddHsnModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{maxWidth:'450px'}}>
            <div className="modal-header">
              <h3>Add HSN / SAC Code</h3>
              <button className="close-btn" onClick={() => setShowAddHsnModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddHsn} style={{display:'flex', flexDirection:'column', gap:'1rem', marginTop:'1rem'}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div>
                  <label className="sub-text">Code</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 847130"
                    value={newHsnForm.code}
                    onChange={(e) => setNewHsnForm({...newHsnForm, code: e.target.value})}
                    className="large-input"
                  />
                </div>
                <div>
                  <label className="sub-text">Type</label>
                  <select 
                    value={newHsnForm.type}
                    onChange={(e) => setNewHsnForm({...newHsnForm, type: e.target.value})}
                    className="large-select"
                  >
                    <option value="HSN">HSN (Goods)</option>
                    <option value="SAC">SAC (Services)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="sub-text">Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Computer Peripherals"
                  value={newHsnForm.desc}
                  onChange={(e) => setNewHsnForm({...newHsnForm, desc: e.target.value})}
                  className="large-input"
                />
              </div>
              <div>
                <label className="sub-text">Default Rate</label>
                <input 
                  type="text" 
                  placeholder="e.g. GST 18%"
                  value={newHsnForm.defaultRate}
                  onChange={(e) => setNewHsnForm({...newHsnForm, defaultRate: e.target.value})}
                  className="large-input"
                />
              </div>
              <div style={{display:'flex', justifyContent:'flex-end', gap:'0.8rem', marginTop:'1rem'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddHsnModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary rainbow-bg">Add Code</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
