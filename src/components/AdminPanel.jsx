import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Server, Activity, Users, AlertTriangle, FileText, Plus, UploadCloud, RefreshCw, Download } from 'lucide-react';
import { adminApi } from '../api';
import './AdminPanel.css';

export default function AdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shops, setShops] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsStatus, setMetricsStatus] = useState('Loading');
  const [checkedAt, setCheckedAt] = useState(null);
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const data = await adminApi.getShops();
      setShops(Array.isArray(data) ? data : []);
      setMetricsStatus('Connected');
      setCheckedAt(new Date().toLocaleTimeString());
    } catch {
      setShops([]);
      setMetricsStatus('Unavailable');
    } finally { setMetricsLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(loadMetrics, 0); return () => window.clearTimeout(timer); }, [loadMetrics]);
  const shopCount = shops.length;
  const trialCount = shops.filter(shop => shop.subscriptionStatus === 'trial').length;
  const renewalsDue = shops.filter(shop => shop.renewalDueSoon).length;
  const invoiceCount = shops.reduce((sum, shop) => sum + Number(shop.metrics?.invoices || 0), 0);

  const renderDashboard = () => (
    <div className="ap-view fade-in">
      <div className="ap-header">
        <div className="ap-title-area">
          <h2 className="ap-title">Admin Control Panel</h2>
          <p className="ap-subtitle">Live shop and subscription overview from your billing database</p>
        </div>
        <button className="btn-refresh-metrics" onClick={loadMetrics} disabled={metricsLoading}><RefreshCw size={16} className={metricsLoading ? 'spin' : ''} /> Refresh Metrics</button>
      </div>

      <div className="ap-grid-4">
        <div className="ap-metric-card"><div className="ap-metric-icon bg-cyan"><Activity size={24}/></div><div className="ap-metric-info"><h4>API & Database</h4><div className="ap-metric-value">{metricsLoading ? '…' : metricsStatus}</div><div className="ap-metric-trend">{checkedAt ? `Checked ${checkedAt}` : 'Live admin API check'}</div></div></div>
        <div className="ap-metric-card"><div className="ap-metric-icon bg-light-purple"><Users size={24}/></div><div className="ap-metric-info"><h4>Client Shops</h4><div className="ap-metric-value">{metricsLoading ? '…' : shopCount}</div><div className="ap-metric-trend">Registered business accounts</div></div></div>
        <div className="ap-metric-card"><div className="ap-metric-icon bg-purple"><Server size={24}/></div><div className="ap-metric-info"><h4>Active Trials</h4><div className="ap-metric-value">{metricsLoading ? '…' : trialCount}</div><div className="ap-metric-trend">Across client shops</div></div></div>
        <div className="ap-metric-card"><div className="ap-metric-icon bg-pink"><HardDrive size={24}/></div><div className="ap-metric-info"><h4>Invoices Recorded</h4><div className="ap-metric-value">{metricsLoading ? '…' : invoiceCount}</div><div className="ap-metric-trend">Across client shops</div></div></div>
      </div>

      <div className="ap-grid-2">
        <div className="ap-card">
          <h3>Service Status</h3>
          <table className="ap-table-modern"><thead><tr><th>Service</th><th>Status</th><th>Details</th></tr></thead><tbody>
            <tr><td><strong>Backend & Database</strong></td><td><span className={`ap-pill ${metricsStatus === 'Connected' ? 'online' : 'warning'}`}>{metricsLoading ? 'Checking' : metricsStatus}</span></td><td>Verified through live admin data request</td></tr>
            <tr><td><strong>File Storage</strong></td><td><span className="ap-pill warning">Not configured</span></td><td>No storage provider configured</td></tr>
            <tr><td><strong>Background Jobs</strong></td><td><span className="ap-pill warning">Not configured</span></td><td>No job scheduler connected</td></tr>
            <tr><td><strong>Payment Gateway</strong></td><td><span className="ap-pill warning">Provider required</span></td><td>Checkout requires Razorpay credentials</td></tr>
          </tbody></table>
        </div>
        <div className="ap-card">
          <h3>Subscription Follow-up</h3>
          {metricsLoading ? <p className="sub-text">Loading account data…</p> : <><p>{renewalsDue} shop{renewalsDue === 1 ? '' : 's'} have a trial or subscription ending within seven days.</p><p className="sub-text">Use the Shops & Branches section to review each account and its recorded activity.</p></>}
          <button className="ap-link" onClick={() => setActiveTab('security')}>Open admin account tools</button>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="ap-view fade-in">
       <div className="ap-header">
        <div>
          <h2 className="ap-title">System Settings</h2>
          <p className="ap-subtitle">Company profile, localization, and general application configuration</p>
        </div>
        <button className="btn-primary rainbow-bg" disabled title="System settings API is not available">Settings API unavailable</button>
      </div>

      <p className="sub-text">These system-wide settings are not connected to persistent storage yet. No values are saved from this screen.</p>

      <div className="grid-2">
        <div className="ap-section">
          <h3>Company Information</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="form-group">
              <label>Legal Business Name</label>
              <input type="text" placeholder="Enter legal business name" />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div className="form-group">
                <label>Company Email</label>
                <input type="email" placeholder="billing@example.com" />
              </div>
              <div className="form-group">
                <label>Company Phone</label>
                <input type="text" placeholder="Business phone" />
              </div>
            </div>
            <div className="form-group">
              <label>Address Line 1</label>
              <input type="text" placeholder="Address line 1" />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div className="form-group">
                <label>City</label>
                <input type="text" placeholder="City" />
              </div>
              <div className="form-group">
                <label>State & PIN Code</label>
                <input type="text" placeholder="State and PIN code" />
              </div>
            </div>
          </div>
        </div>

        <div className="ap-section">
          <h3>Localization & Formats</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="form-group">
              <label>Financial Year Start</label>
              <select defaultValue="apr">
                <option value="jan">January 1st</option>
                <option value="apr">April 1st (India Standard)</option>
                <option value="jul">July 1st</option>
              </select>
            </div>
            <div className="form-group">
              <label>Time Zone</label>
              <select defaultValue="ist">
                <option value="utc">UTC (Universal Time)</option>
                <option value="ist">Asia/Kolkata (IST)</option>
                <option value="est">America/New_York (EST)</option>
              </select>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div className="form-group">
                <label>Date Format</label>
                <select defaultValue="ddmmyyyy">
                  <option value="ddmmyyyy">DD-MM-YYYY</option>
                  <option value="mmddyyyy">MM/DD/YYYY</option>
                  <option value="yyyymmdd">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time Format</label>
                <select defaultValue="12h">
                  <option value="12h">12-Hour (AM/PM)</option>
                  <option value="24h">24-Hour</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTaxCurrency = () => (
    <div className="ap-view fade-in">
       <div className="ap-header">
        <div>
          <h2 className="ap-title">Tax & Currency Config</h2>
          <p className="ap-subtitle">Manage GST/VAT rates, HSN codes, and multi-currency exchange rates</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="ap-section">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
            <h3>Tax rate examples</h3>
            <button className="btn-secondary" disabled title="Tax settings are not persisted by the admin API" style={{padding:'0.2rem 0.5rem'}}><Plus size={16}/> Tax API unavailable</button>
          </div>
          <div className="form-group">
            <label>GSTIN Number</label>
            <input type="text" placeholder="Enter your GSTIN" />
          </div>
          
          <table className="ap-table" style={{marginTop:'1.5rem'}}>
            <thead>
              <tr>
                <th>Tax Name</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>GST @ 18%</strong><br/><span className="sub-text">CGST 9% + SGST 9%</span></td>
                <td>18%</td>
                <td>Example only</td>
                <td><button className="btn-secondary" disabled style={{padding:'0.2rem 0.5rem'}}>Unavailable</button></td>
              </tr>
              <tr>
                <td><strong>IGST @ 18%</strong><br/><span className="sub-text">Inter-state sales</span></td>
                <td>18%</td>
                <td>Example only</td>
                <td><button className="btn-secondary" disabled style={{padding:'0.2rem 0.5rem'}}>Unavailable</button></td>
              </tr>
              <tr>
                <td><strong>TDS @ 10%</strong><br/><span className="sub-text">Tax Deducted at Source</span></td>
                <td>10%</td>
                <td>Example only</td>
                <td><button className="btn-secondary" disabled style={{padding:'0.2rem 0.5rem'}}>Unavailable</button></td>
              </tr>
            </tbody>
          </table>
          
          <div style={{marginTop:'2rem'}}>
             <div className="setting-row" style={{padding:'0', border:'none'}}>
              <div>
                <strong>Auto-Calculate Reverse Charge (RCM)</strong>
                <div className="sub-text">Apply RCM automatically for applicable vendors</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
          </div>
        </div>

        <div className="ap-section">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
            <h3>Currency & Exchange Rates</h3>
            <button className="btn-secondary" disabled title="No exchange-rate provider is configured" style={{padding:'0.2rem 0.5rem'}}><RefreshCw size={16}/> Rates unavailable</button>
          </div>
          
          <div className="form-group" style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
            <label>Base Currency</label>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'0.5rem'}}>
              <strong style={{fontSize:'1.2rem'}}>INR (₹)</strong>
              <span className="sub-text">- Indian Rupee</span>
            </div>
          </div>

          <table className="ap-table" style={{marginTop:'1.5rem'}}>
            <thead>
              <tr>
                <th>Currency</th>
                <th>Exchange Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>USD ($)</strong><br/><span className="sub-text">US Dollar</span></td>
                <td>Rate unavailable</td>
                <td>Not configured</td>
              </tr>
              <tr>
                <td><strong>EUR (€)</strong><br/><span className="sub-text">Euro</span></td>
                <td>Rate unavailable</td>
                <td>Not configured</td>
              </tr>
              <tr>
                <td><strong>GBP (£)</strong><br/><span className="sub-text">British Pound</span></td>
                <td>Rate unavailable</td>
                <td>Not configured</td>
              </tr>
            </tbody>
          </table>
          
          <div style={{marginTop:'2rem'}}>
             <div className="setting-row" style={{padding:'0', border:'none'}}>
              <div>
                <strong>Auto-Update Exchange Rates</strong>
                <div className="sub-text">No exchange-rate provider is connected</div>
              </div>
              <span className="sub-text">Not configured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplatesWorkflows = () => (
    <div className="ap-view fade-in">
       <div className="ap-header">
        <div>
          <h2 className="ap-title">Templates & Workflows</h2>
          <p className="ap-subtitle">Invoice templates, custom fields, and approval hierarchies</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="ap-section">
          <h3>Invoice Templates</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Assign templates to specific branches or set a global default.</p>
          
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                <div className="metric-icon" style={{background:'#8b5cf6', color:'white', width:'40px', height:'40px'}}><FileText size={20}/></div>
                <div>
                  <strong>Standard B2B Invoice (Default)</strong>
                  <div className="sub-text">Includes GST breakdown & Bank Details</div>
                </div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}}>Builder</button>
            </div>
            
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                <div className="metric-icon" style={{background:'#10b981', color:'white', width:'40px', height:'40px'}}><FileText size={20}/></div>
                <div>
                  <strong>Proforma Template</strong>
                  <div className="sub-text">Clean layout for quotations</div>
                </div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}}>Builder</button>
            </div>
            
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                <div className="metric-icon" style={{background:'#ef4444', color:'white', width:'40px', height:'40px'}}><FileText size={20}/></div>
                <div>
                  <strong>Thermal POS Receipt</strong>
                  <div className="sub-text">Assigned to Retail Branch</div>
                </div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}}>Builder</button>
            </div>
          </div>
        </div>

        <div className="ap-section">
          <h3>Approval Workflows</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Enforce multi-level approvals for critical financial actions.</p>
          
          <table className="ap-table">
            <thead>
              <tr>
                <th>Action Module</th>
                <th>Condition</th>
                <th>Approver Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Purchase Orders</strong></td>
                <td>Amount &gt; ₹50,000</td>
                <td>Manager / Admin</td>
                <td><div className="toggle-switch on"></div></td>
              </tr>
              <tr>
                <td><strong>Expense Claims</strong></td>
                <td>All Expenses</td>
                <td>Accountant</td>
                <td><div className="toggle-switch on"></div></td>
              </tr>
              <tr>
                <td><strong>Credit Notes</strong></td>
                <td>Amount &gt; ₹10,000</td>
                <td>Admin</td>
                <td><div className="toggle-switch on"></div></td>
              </tr>
              <tr>
                <td><strong>Sales Quotations</strong></td>
                <td>Discount &gt; 15%</td>
                <td>Manager</td>
                <td><div className="toggle-switch on"></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="ap-view fade-in">
       <div className="ap-header">
        <div>
          <h2 className="ap-title">Security & Permissions</h2>
          <p className="ap-subtitle">Role-Based Access Control (RBAC), policies, and audit logs</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="ap-section">
          <h3>Role-Based Access Control</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Administrator</strong>
                <div className="sub-text">Full system access. Manage all settings.</div>
              </div>
              <button className="btn-secondary" style={{padding:'0.3rem 0.5rem'}} disabled>System</button>
            </div>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Manager</strong>
                <div className="sub-text">View reports, approve transactions, operations.</div>
              </div>
              <button className="btn-secondary" style={{padding:'0.3rem 0.5rem'}}>Edit Matrix</button>
            </div>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Accountant</strong>
                <div className="sub-text">Invoices, ledgers, taxes, journals.</div>
              </div>
              <button className="btn-secondary" style={{padding:'0.3rem 0.5rem'}}>Edit Matrix</button>
            </div>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Salesperson</strong>
                <div className="sub-text">Customers, quotations, collections.</div>
              </div>
              <button className="btn-secondary" style={{padding:'0.3rem 0.5rem'}}>Edit Matrix</button>
            </div>
            <button className="btn-secondary" style={{marginTop:'0.5rem'}}><Plus size={16}/> Create Custom Role</button>
          </div>
        </div>

        <div className="ap-section">
          <h3>Security Policies</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="setting-row" style={{padding:'0.5rem 0'}}>
              <div>
                <strong>Enforce 2FA for all users</strong>
                <div className="sub-text">Requires Google Authenticator or SMS OTP</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
            <div className="setting-row" style={{padding:'0.5rem 0'}}>
              <div>
                <strong>Session Timeout</strong>
                <div className="sub-text">Auto-logout inactive users</div>
              </div>
              <select style={{padding:'0.4rem', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}>
                <option>15 Minutes</option>
                <option selected>30 Minutes</option>
                <option>1 Hour</option>
              </select>
            </div>
            <div className="setting-row" style={{padding:'0.5rem 0'}}>
              <div>
                <strong>Account Lockout</strong>
                <div className="sub-text">Lock after 5 failed login attempts</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
            <div className="setting-row" style={{padding:'0.5rem 0', borderBottom:'none'}}>
              <div>
                <strong>IP Whitelisting</strong>
                <div className="sub-text">Restrict admin access to specific office IPs</div>
              </div>
              <div className="toggle-switch"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="ap-section">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
          <h3>Comprehensive Audit Log</h3>
          <button className="btn-secondary" disabled title="Audit events are not persisted by the backend" style={{padding:'0.3rem 0.8rem'}}><Download size={16}/> Audit log unavailable</button>
        </div>
        <table className="ap-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Module</th>
              <th>Action</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody><tr><td colSpan="5" className="sub-text">Audit events are not recorded by the current backend.</td></tr></tbody>
        </table>
      </div>
    </div>
  );

  const renderBackups = () => (
    <div className="ap-view fade-in">
       <div className="ap-header">
        <div>
          <h2 className="ap-title">Backup Management</h2>
          <p className="ap-subtitle">Protect system data, configure S3 storage, and manage recovery</p>
        </div>
        <button className="btn-primary rainbow-bg" disabled title="No backup provider is configured"><UploadCloud size={16}/> Backup provider not configured</button>
      </div>

      <div className="grid-2">
        <div className="ap-section">
          <h3>Storage & Schedules</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="form-group">
              <label>Backup Storage Destination</label>
              <select defaultValue="s3">
                <option value="local">Local Server Storage</option>
                <option value="s3">Amazon S3 (Recommended)</option>
                <option value="gcp">Google Cloud Storage</option>
                <option value="ftp">External FTP Server</option>
              </select>
            </div>
            
            <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)', margin:'1rem 0'}}>
              <h4 style={{marginBottom:'0.5rem'}}>AWS S3 Configuration</h4>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <input type="text" placeholder="Bucket Name" style={{padding:'0.5rem', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-primary)'}}/>
                <input type="text" placeholder="Region" style={{padding:'0.5rem', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-primary)'}}/>
              </div>
              <button className="btn-secondary" style={{width:'100%', marginTop:'0.5rem'}} disabled title="Backup provider integration is not implemented">Backup provider unavailable</button>
            </div>

            <div className="setting-row" style={{padding:'1rem 0'}}>
              <div>
                <strong>Automated Database Backup</strong>
                <div className="sub-text">No scheduled backup service is configured</div>
              </div>
              <span className="sub-text">Not configured</span>
            </div>
            <div className="setting-row" style={{padding:'1rem 0'}}>
              <div>
                <strong>Automated File Backup (Attachments)</strong>
                <div className="sub-text">File backup service is not configured</div>
              </div>
              <span className="sub-text">Not configured</span>
            </div>
          </div>
        </div>

        <div className="ap-section">
          <h3>Backup History & Recovery</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>View recent backup snapshots and initiate point-in-time recovery.</p>
          
          <table className="ap-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Type</th>
                <th>Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan="4" className="sub-text">No backup provider is configured. No snapshots are available to restore.</td></tr>
            </tbody>
          </table>
          
          <div style={{marginTop:'2rem', padding:'1rem', background:'rgba(239, 68, 68, 0.1)', border:'1px solid #ef4444', borderRadius:'8px'}}>
            <h4 style={{color:'#ef4444', display:'flex', alignItems:'center', gap:'0.5rem'}}><AlertTriangle size={18}/> Danger Zone</h4>
            <p style={{fontSize:'0.9rem', margin:'0.5rem 0'}}>Performing a full restore will overwrite all current system data with the snapshot. This cannot be undone.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-panel-wrapper">
      <div className="ap-tabs-top">
        <button className={`ap-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Monitoring</button>
        <button className={`ap-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>System Settings</button>
        <button className={`ap-tab ${activeTab === 'tax' ? 'active' : ''}`} onClick={() => setActiveTab('tax')}>Tax & Currency</button>
        <button className={`ap-tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>Templates & Workflows</button>
        <button className={`ap-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security & Audit</button>
        <button className={`ap-tab ${activeTab === 'backups' ? 'active' : ''}`} onClick={() => setActiveTab('backups')}>Backups</button>
      </div>

      <button className="back-btn-top" onClick={onBack}>← Back to Home</button>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'settings' && renderSystemSettings()}
      {activeTab === 'tax' && renderTaxCurrency()}
      {activeTab === 'templates' && renderTemplatesWorkflows()}
      {activeTab === 'security' && renderSecurity()}
      {activeTab === 'backups' && renderBackups()}
    </div>
  );
}
