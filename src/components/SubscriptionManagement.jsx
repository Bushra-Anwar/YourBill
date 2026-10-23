import { useState } from 'react';
import { 
  RefreshCw, Users, CreditCard, TrendingDown, CheckCircle, Plus
} from 'lucide-react';
import './SubscriptionManagement.css';

export default function SubscriptionManagement({ onBack, onChoosePlan }) {
  const [activeTab, setActiveTab] = useState('dashboard'); 

  const renderDashboard = () => (
    <div className="sm-view fade-in">
      <div className="sm-header">
        <div><h2 className="sm-title">Subscription overview</h2><p className="sm-subtitle">Live totals will appear when subscription records are connected.</p></div>
      </div>
      <div className="grid-4">
        <div className="metric-card"><div className="metric-icon bg-blue"><RefreshCw size={24}/></div><div className="metric-info"><h4>Monthly recurring revenue</h4><div className="metric-value">₹0</div><div className="metric-trend">No subscription records</div></div></div>
        <div className="metric-card"><div className="metric-icon bg-green"><Users size={24}/></div><div className="metric-info"><h4>Active subscribers</h4><div className="metric-value">0</div><div className="metric-trend">No subscriber records</div></div></div>
        <div className="metric-card"><div className="metric-icon bg-purple"><TrendingDown size={24}/></div><div className="metric-info"><h4>Churn rate</h4><div className="metric-value">—</div><div className="metric-trend">No history available</div></div></div>
        <div className="metric-card"><div className="metric-icon bg-blue"><CreditCard size={24}/></div><div className="metric-info"><h4>Average revenue per user</h4><div className="metric-value">—</div><div className="metric-trend">No subscriber records</div></div></div>
      </div>
      <div className="grid-2">
        <div className="sm-section"><h3>Upcoming renewals</h3><p className="sub-text">No renewal records yet.</p></div>
        <div className="sm-section"><h3>Subscription activity</h3><p className="sub-text">No subscription events have been recorded.</p></div>
      </div>
    </div>
  );
  const renderSubscriptions = () => (
    <div className="sm-view fade-in">
      <div className="sm-header"><div><h2 className="sm-title">Manage subscriptions</h2><p className="sm-subtitle">Subscription records will appear here when a billing provider is connected.</p></div></div>
      <div className="sm-section"><div className="empty-state">No subscription records yet.</div></div>
    </div>
  );
  const renderPlans = () => (
    <div className="sm-view fade-in">
       <div className="sm-header">
        <div>
          <h2 className="sm-title">Subscription Plans</h2>
          <p className="sm-subtitle">Configure pricing tiers, limits, and billing cycles</p>
        </div>
        <button className="btn-primary rainbow-bg" onClick={onChoosePlan}><Plus size={16}/> View checkout plans</button>
      </div>

      <div className="grid-3">
        <div className="plan-card">
          <div>
            <h3 style={{fontSize:'1.5rem'}}>Starter</h3>
            <div className="plan-price">₹999<span> / mo</span></div>
            <p className="sub-text" style={{marginBottom:'1rem'}}>Perfect for small businesses starting out.</p>
          </div>
          <ul className="plan-features">
            <li><CheckCircle size={16} color="#10b981"/> Invoice and buyer management</li>
            <li><CheckCircle size={16} color="#10b981"/> Product catalog</li>
            <li><CheckCircle size={16} color="#10b981"/> Everyday billing tools</li>
          </ul>
          <button className="btn-primary" style={{width:'100%', marginTop:'1rem'}} onClick={onChoosePlan}>View checkout options</button>
        </div>

        <div className="plan-card" style={{borderColor:'#8b5cf6', boxShadow:'0 0 0 2px rgba(139, 92, 246, 0.2)'}}>
          <div style={{position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)', background:'var(--rainbow-gradient)', color:'white', padding:'4px 12px', borderRadius:'12px', fontSize:'0.8rem', fontWeight:'bold'}}>MOST POPULAR</div>
          <div>
            <h3 style={{fontSize:'1.5rem'}}>Professional</h3>
            <div className="plan-price">₹2,999<span> / mo</span></div>
            <p className="sub-text" style={{marginBottom:'1rem'}}>Advanced features for growing teams.</p>
          </div>
          <ul className="plan-features">
            <li><CheckCircle size={16} color="#10b981"/> Everything in Starter</li>
            <li><CheckCircle size={16} color="#10b981"/> Inventory and GST tools</li>
            <li><CheckCircle size={16} color="#10b981"/> Business analytics</li>
            <li><CheckCircle size={16} color="#10b981"/> Team workflows</li>
          </ul>
          <button className="btn-primary rainbow-bg" style={{width:'100%', marginTop:'1rem'}} onClick={onChoosePlan}>View checkout options</button>
        </div>

        <div className="plan-card">
          <div>
            <h3 style={{fontSize:'1.5rem'}}>Enterprise</h3>
            <div className="plan-price">₹9,999<span> / mo</span></div>
            <p className="sub-text" style={{marginBottom:'1rem'}}>Custom limits for large scale operations.</p>
          </div>
          <ul className="plan-features">
            <li><CheckCircle size={16} color="#10b981"/> Everything in Professional</li>
            <li><CheckCircle size={16} color="#10b981"/> Role and access management</li>
            <li><CheckCircle size={16} color="#10b981"/> Advanced platform controls</li>
            <li><CheckCircle size={16} color="#10b981"/> Broader business insights</li>
          </ul>
          <button className="btn-primary" style={{width:'100%', marginTop:'1rem'}} onClick={onChoosePlan}>View checkout options</button>
        </div>
      </div>
      
      <p className="sub-text" style={{marginTop:'1rem'}}>Checkout prices are set on the server and shown before payment.</p>
    </div>
  );

  const renderCoupons = () => (
    <div className="sm-view fade-in">
       <div className="sm-header">
        <div>
          <h2 className="sm-title">Coupons & Promotions</h2>
          <p className="sm-subtitle">Manage discount codes, free months, and campaigns</p>
        </div>
        <button className="btn-primary rainbow-bg"><Plus size={16}/> Create Coupon</button>
      </div>

      <div className="grid-3">
        <div className="sm-section" style={{borderLeft:'4px solid #8b5cf6'}}>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <h3>SAVE20</h3>
            <span className="status-badge active">Active</span>
          </div>
          <p className="sub-text" style={{margin:'0.5rem 0'}}>20% Off (Duration: Forever)</p>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'1rem', fontSize:'0.9rem'}}>
            <span>Redemptions: <strong>142</strong> / ∞</span>
            <span>Applies to: <strong>All Plans</strong></span>
          </div>
        </div>

        <div className="sm-section" style={{borderLeft:'4px solid #10b981'}}>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <h3>WELCOME500</h3>
            <span className="status-badge active">Active</span>
          </div>
          <p className="sub-text" style={{margin:'0.5rem 0'}}>₹500 Off (Duration: First Month)</p>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'1rem', fontSize:'0.9rem'}}>
            <span>Redemptions: <strong>89</strong> / 500</span>
            <span>Applies to: <strong>New Users</strong></span>
          </div>
        </div>
        
        <div className="sm-section" style={{borderLeft:'4px solid #ef4444', opacity:0.7}}>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <h3>BFCM2025</h3>
            <span className="status-badge cancelled">Expired</span>
          </div>
          <p className="sub-text" style={{margin:'0.5rem 0'}}>30% Off (Duration: 6 Months)</p>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'1rem', fontSize:'0.9rem'}}>
            <span>Redemptions: <strong>412</strong></span>
            <span>Ended: <strong>Dec 01, 2025</strong></span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="sm-view fade-in">
       <div className="sm-header">
        <div>
          <h2 className="sm-title">Subscription Settings</h2>
          <p className="sm-subtitle">Configure auto-renewals, trials, proration, and dunning</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="sm-section">
          <h3>Renewal & Dunning Logic</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="setting-row">
              <div>
                <strong>Auto-Renew Subscriptions</strong>
                <div className="sub-text">Attempt payment on renewal date</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
            <div className="setting-row">
              <div>
                <strong>Smart Retry Logic (Dunning)</strong>
                <div className="sub-text">Retry failed payments on Days 3, 5, 7</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
            <div className="setting-row">
              <div>
                <strong>Grace Period</strong>
                <div className="sub-text">Days before Past Due suspension</div>
              </div>
              <select style={{padding:'0.4rem', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}>
                <option>0 Days</option>
                <option>3 Days</option>
                <option selected>7 Days</option>
                <option>14 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="sm-section">
          <h3>Proration & Trials</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="setting-row">
              <div>
                <strong>Upgrade Proration</strong>
                <div className="sub-text">Charge difference immediately</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
            <div className="setting-row">
              <div>
                <strong>Downgrade Credit</strong>
                <div className="sub-text">Apply remaining value to next cycle</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
            <div className="setting-row">
              <div>
                <strong>Enable Free Trials</strong>
                <div className="sub-text">Allow users to test before paying</div>
              </div>
              <div className="toggle-switch on"></div>
            </div>
            <div className="setting-row" style={{borderBottom:'none'}}>
              <div>
                <strong>Default Trial Duration</strong>
              </div>
              <select style={{padding:'0.4rem', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}>
                <option>7 Days</option>
                <option selected>14 Days</option>
                <option>30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="subscription-management-wrapper">
      {activeTab === 'dashboard' && (
        <div className="sm-header" style={{paddingBottom:0, borderBottom:'none', marginBottom:'1rem'}}>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
        </div>
      )}
      
      <div className="tabs-simple">
        <button className={`tab-simple ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Analytics & Dashboard</button>
        <button className={`tab-simple ${activeTab === 'subs' ? 'active' : ''}`} onClick={() => setActiveTab('subs')}>Subscriptions</button>
        <button className={`tab-simple ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>Plans & Pricing</button>
        <button className={`tab-simple ${activeTab === 'coupons' ? 'active' : ''}`} onClick={() => setActiveTab('coupons')}>Coupons</button>
        <button className={`tab-simple ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings & Rules</button>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'subs' && renderSubscriptions()}
      {activeTab === 'plans' && renderPlans()}
      {activeTab === 'coupons' && renderCoupons()}
      {activeTab === 'settings' && renderSettings()}
    </div>
  );
}
