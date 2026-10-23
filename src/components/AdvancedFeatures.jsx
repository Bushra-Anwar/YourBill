import { useState } from 'react';
import { Briefcase, Moon, Sun, Terminal, Webhook, Upload, Smartphone, WifiOff, Shield, Database, Plus, AlertTriangle, Layers } from 'lucide-react';
import './AdvancedFeatures.css';

export default function AdvancedFeatures({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);

  const renderDashboard = () => (
    <div className="af-view fade-in">
      <div className="af-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
          <h2 className="af-title">Advanced Enterprise Features</h2>
          <p className="af-subtitle">Multi-company, APIs, PWA offline support, and security</p>
        </div>
      </div>

      <div className="grid-4">
        <div className="metric-card">
          <div className="metric-icon bg-blue"><Briefcase size={24}/></div>
          <div className="metric-info">
            <h4>Active Companies</h4>
            <div className="metric-value">—</div>
            <div className="metric-trend">Multi-company records are not connected</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-green"><Terminal size={24}/></div>
          <div className="metric-info">
            <h4>API Requests</h4>
            <div className="metric-value">—</div>
            <div className="metric-trend">API usage tracking is not configured</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-purple"><Webhook size={24}/></div>
          <div className="metric-info">
            <h4>Webhooks Sent</h4>
            <div className="metric-value">—</div>
            <div className="metric-trend">Webhook delivery service is not configured</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><WifiOff size={24}/></div>
          <div className="metric-info">
            <h4>Offline Sync Queue</h4>
            <div className="metric-value text-orange">0</div>
            <div className="metric-trend">Offline queue tracking is unavailable</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="af-section">
          <h3>Recent Webhook Deliveries</h3>
          <table className="af-table" style={{marginTop:'1.5rem'}}>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Destination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody><tr><td colSpan="3" className="sub-text">No webhook delivery provider is connected, so there is no delivery history.</td></tr></tbody>
          </table>
          <button className="btn-secondary" style={{width:'100%', marginTop:'1rem'}} onClick={() => setActiveTab('apis')}>View All Webhooks</button>
        </div>

        <div className="af-section">
          <h3>Enterprise Compliance Status</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'1rem'}}>
              <div style={{color:'#10b981'}}><Shield size={20}/></div>
              <div style={{flex:1}}>
                <strong>Single Sign-On (SSO)</strong>
                <div className="sub-text">No SSO identity provider is configured.</div>
              </div>
              <span className="status-badge">Not configured</span>
            </div>
            
            <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'1rem'}}>
              <div style={{color:'#10b981'}}><Database size={20}/></div>
              <div style={{flex:1}}>
                <strong>Data Encryption</strong>
                <div className="sub-text">Storage encryption status is not reported by this app.</div>
              </div>
              <span className="status-badge">Unverified</span>
            </div>

            <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'1rem'}}>
              <div style={{color:'#f59e0b'}}><AlertTriangle size={20}/></div>
              <div style={{flex:1}}>
                <strong>GDPR Data Portability</strong>
                <div className="sub-text">No data portability request workflow is connected.</div>
              </div>
              <button className="btn-secondary" disabled style={{padding:'0.3rem 0.5rem'}}>Unavailable</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMultiCompany = () => (
    <div className="af-view fade-in">
       <div className="af-header">
        <div>
          <h2 className="af-title">Multi-Company Support</h2>
          <p className="af-subtitle">Manage multiple distinct businesses from a single account</p>
        </div>
        <button className="btn-primary rainbow-bg" disabled title="Multi-company support is not connected"><Plus size={16}/> Multi-company unavailable</button>
      </div>

      <div className="af-section">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
          <div>
            <h3>Company workspaces</h3>
            <span className="sub-text">No multi-company workspace API is connected. Manage branches from the admin shop tools.</span>
          </div>
        </div>

        <div style={{marginTop:'2rem'}}>
          <h3>Consolidated Reporting</h3>
          <p className="sub-text" style={{marginBottom:'1rem'}}>View combined metrics across all your companies.</p>
          <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
            <div>
              <strong>Enable Cross-Company Dashboards</strong>
              <div className="sub-text">Requires common base currency conversion (Default: INR)</div>
            </div>
            <div className="toggle-switch on"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocalization = () => (
    <div className="af-view fade-in">
       <div className="af-header">
        <div>
          <h2 className="af-title">Localization & Theme Engine</h2>
          <p className="af-subtitle">Multi-language, RTL support, and Dark/Light UI modes</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="af-section">
          <h3>Multi-Language & Region</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="form-group">
              <label>System Default Language</label>
              <select defaultValue="en">
                <option value="en">English (US)</option>
                <option value="hi">Hindi (India)</option>
                <option value="es">Spanish</option>
                <option value="ar">Arabic (RTL)</option>
                <option value="fr">French</option>
              </select>
            </div>
            
            <div className="setting-row" style={{padding:'1rem 0'}}>
              <div>
                <strong>Enable Right-to-Left (RTL)</strong>
                <div className="sub-text">Auto-enabled for Arabic, Hebrew, Urdu</div>
              </div>
              <div className="toggle-switch"></div>
            </div>

            <div className="setting-row" style={{padding:'1rem 0'}}>
              <div>
                <strong>Auto-Translate Invoices</strong>
                <div className="sub-text">Translate based on customer's preferred language</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
          </div>
        </div>

        <div className="af-section">
          <h3>UI Theme Management</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="setting-row" style={{padding:'0 0 1rem 0'}}>
              <div>
                <strong>Enforce Dark Mode Globally</strong>
                <div className="sub-text">Override user system preferences</div>
              </div>
              <div className={`toggle-switch ${isDark ? 'on' : ''}`} onClick={() => setIsDark(!isDark)}></div>
            </div>

            <label style={{fontWeight:500, fontSize:'0.9rem', display:'block', marginBottom:'0.5rem'}}>Theme Preview</label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div className={`theme-preview-box dark ${isDark ? 'active' : ''}`} onClick={() => setIsDark(true)}>
                <Moon size={24} style={{marginRight:'10px'}}/> Dark Mode (Active)
              </div>
              <div className={`theme-preview-box light ${!isDark ? 'active' : ''}`} onClick={() => setIsDark(false)}>
                <Sun size={24} style={{marginRight:'10px'}}/> Light Mode
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDeveloperApis = () => (
    <div className="af-view fade-in">
       <div className="af-header">
        <div>
          <h2 className="af-title">Developer APIs & Webhooks</h2>
          <p className="af-subtitle">Generate API keys and configure real-time webhooks</p>
        </div>
        <button className="btn-secondary" disabled title="No public API documentation is configured">API docs unavailable</button>
      </div>

      <div className="grid-2">
        <div className="af-section">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
            <h3>API Keys</h3>
            <button className="btn-secondary" disabled title="API key management is not implemented" style={{padding:'0.2rem 0.5rem'}}><Plus size={16}/> Key management unavailable</button>
          </div>
          
          <table className="af-table">
            <thead>
              <tr>
                <th>Name / Token</th>
                <th>Permissions</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody><tr><td colSpan="3" className="sub-text">No API keys are stored. Key creation and revocation are not implemented.</td></tr></tbody>
          </table>

          <div style={{marginTop:'1.5rem'}}>
            <label style={{fontWeight:500, fontSize:'0.9rem', display:'block', marginBottom:'0.5rem'}}>API Rate Limiting</label>
            <select disabled style={{width:'100%', padding:'0.8rem', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}>
              <option>100 Requests / Minute</option>
              <option>1000 Requests / Hour</option>
              <option>Unlimited (Enterprise Only)</option>
            </select>
          </div>
        </div>

        <div className="af-section">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
            <h3>Webhooks</h3>
            <button className="btn-secondary" disabled title="Webhook endpoints are not implemented" style={{padding:'0.2rem 0.5rem'}}><Plus size={16}/> Webhooks unavailable</button>
          </div>
          
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
             <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                <strong>Webhook endpoint examples</strong>
                <span className="status-badge">Not connected</span>
              </div>
              <div className="sub-text" style={{marginBottom:'0.5rem'}}>Example payload only. Webhook delivery is not configured.</div>
              <div className="code-block">
{`{
  "event": "invoice.paid",
  "invoice_id": "INV-2026-001",
  "amount": 25000,
  "status": "paid"
}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataManagement = () => (
    <div className="af-view fade-in">
       <div className="af-header">
        <div>
          <h2 className="af-title">Data Export & Import</h2>
          <p className="af-subtitle">Bulk data movement, backups, and external migrations</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="af-section">
          <h3>Bulk Import & Migrations</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Import CSV/Excel data or migrate directly from legacy software.</p>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div aria-disabled="true" style={{border:'1px dashed var(--border-color)', borderRadius:'8px', padding:'2rem 1rem', textAlign:'center', opacity:0.65}}>
              <Upload size={32} style={{margin:'0 auto 1rem auto', color:'#8b5cf6'}}/>
              <strong>Bulk import unavailable</strong>
              <div className="sub-text" style={{marginTop:'0.5rem'}}>No importer is connected for customers, invoices, or items.</div>
            </div>
            
            <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
              <button className="btn-secondary" disabled style={{flex:1, justifyContent:'flex-start'}}><Layers size={16} style={{marginRight:'10px'}}/> Tally import unavailable</button>
              <button className="btn-secondary" disabled style={{flex:1, justifyContent:'flex-start'}}><Layers size={16} style={{marginRight:'10px'}}/> QuickBooks import unavailable</button>
              <button className="btn-secondary" disabled style={{flex:1, justifyContent:'flex-start'}}><Layers size={16} style={{marginRight:'10px'}}/> Zoho import unavailable</button>
            </div>
          </div>
        </div>

        <div className="af-section">
          <h3>Scheduled Exports</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Automatically export reports and data to external servers or email.</p>
          
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Daily sales export</strong>
                <div className="sub-text">FTP destination and schedule are not configured</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Monthly tax report</strong>
                <div className="sub-text">Email delivery and schedule are not configured</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
            <button className="btn-secondary" disabled title="Scheduled exports are not implemented" style={{marginTop:'0.5rem'}}><Plus size={16}/> Scheduled exports unavailable</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEnterprisePWA = () => (
    <div className="af-view fade-in">
       <div className="af-header">
        <div>
          <h2 className="af-title">Enterprise Security & PWA</h2>
          <p className="af-subtitle">Offline capabilities and strict access compliance</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="af-section">
          <h3>Offline Support (PWA)</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Allow field agents to create invoices and orders without internet. Data syncs automatically when online.</p>
          
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Enable Offline Mode</strong>
                <div className="sub-text">Offline storage and sync are not implemented</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
            
            <div style={{padding:'1rem', background:'rgba(59, 130, 246, 0.1)', border:'1px solid #3b82f6', borderRadius:'8px'}}>
              <h4 style={{color:'#3b82f6', display:'flex', alignItems:'center', gap:'0.5rem'}}><Smartphone size={18}/> Background Sync Status</h4>
          <p style={{fontSize:'0.9rem', margin:'0.5rem 0'}}>Offline write queue and background sync are not implemented, so sync status cannot be confirmed here.</p>
              <button className="btn-secondary" disabled title="Background sync is not implemented" style={{color:'#3b82f6', borderColor:'#3b82f6', background:'transparent'}}>Sync unavailable</button>
            </div>
          </div>
        </div>

        <div className="af-section">
          <h3>Enterprise Security (SSO)</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Integrate with your organization's identity providers.</p>
          
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Active Directory / LDAP</strong>
                <div className="sub-text">Identity provider integration is not configured</div>
              </div>
              <div className="toggle-switch"></div>
            </div>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>Google Workspace (OAuth2)</strong>
                <div className="sub-text">Google OAuth sign-in is not configured</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
             <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div>
                <strong>SAML 2.0 (Okta/Azure)</strong>
                <div className="sub-text">No SAML identity provider is configured</div>
              </div>
              <button className="btn-secondary" disabled style={{padding:'0.3rem 0.5rem'}}>Unavailable</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="advanced-features-wrapper">
      {activeTab === 'dashboard' && (
        <div className="af-header" style={{paddingBottom:0, borderBottom:'none', marginBottom:'1rem'}}>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
        </div>
      )}
      
      <div className="tabs-simple">
        <button className={`tab-simple ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Overview</button>
        <button className={`tab-simple ${activeTab === 'multicompany' ? 'active' : ''}`} onClick={() => setActiveTab('multicompany')}>Multi-Company</button>
        <button className={`tab-simple ${activeTab === 'localization' ? 'active' : ''}`} onClick={() => setActiveTab('localization')}>Localization & Theme</button>
        <button className={`tab-simple ${activeTab === 'apis' ? 'active' : ''}`} onClick={() => setActiveTab('apis')}>Developer APIs & Webhooks</button>
        <button className={`tab-simple ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>Data Management</button>
        <button className={`tab-simple ${activeTab === 'enterprise' ? 'active' : ''}`} onClick={() => setActiveTab('enterprise')}>Enterprise Security & PWA</button>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'multicompany' && renderMultiCompany()}
      {activeTab === 'localization' && renderLocalization()}
      {activeTab === 'apis' && renderDeveloperApis()}
      {activeTab === 'data' && renderDataManagement()}
      {activeTab === 'enterprise' && renderEnterprisePWA()}
    </div>
  );
}
