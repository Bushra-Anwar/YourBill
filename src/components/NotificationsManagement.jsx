import { useState } from 'react';
import { Mail, MessageSquare, Send, Clock, AlertTriangle, FileText, MessageCircle, Edit, Trash2, Plus } from 'lucide-react';
import './NotificationsManagement.css';

export default function NotificationsManagement({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, compose, templates, automation, logs
  const [channel, setChannel] = useState('Email');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const openDraft = () => {
    if (!recipient.trim() || !message.trim()) { window.alert('Recipient aur message dono fill karein.'); return; }
    if (channel === 'Email') {
      window.open(`mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`, '_self');
      return;
    }
    if (channel === 'WhatsApp') {
      const phone = recipient.replace(/\D/g, '');
      if (phone.length < 10) { window.alert('Valid phone number daalein.'); return; }
      window.open(`https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.alert('SMS provider configured nahi hai. Email ya WhatsApp draft use karein.');
  };

  const renderDashboard = () => (
    <div className="nm-view fade-in">
      <div className="nm-header"><div><button className="back-btn" onClick={onBack}>← Back to Home</button><h2 className="nm-title">Notifications</h2><p className="nm-subtitle">Delivery totals appear here after a messaging service is connected.</p></div></div>
      <div className="grid-4">
        <div className="metric-card"><div className="metric-icon bg-blue"><Mail size={24}/></div><div className="metric-info"><h4>Emails sent</h4><div className="metric-value">—</div><div className="metric-trend">No delivery log connected</div></div></div>
        <div className="metric-card"><div className="metric-icon bg-green"><MessageCircle size={24}/></div><div className="metric-info"><h4>WhatsApp messages</h4><div className="metric-value">—</div><div className="metric-trend">No delivery log connected</div></div></div>
        <div className="metric-card"><div className="metric-icon bg-orange"><MessageSquare size={24}/></div><div className="metric-info"><h4>SMS delivered</h4><div className="metric-value">—</div><div className="metric-trend">No delivery log connected</div></div></div>
        <div className="metric-card"><div className="metric-icon"><AlertTriangle size={24}/></div><div className="metric-info"><h4>Failed notifications</h4><div className="metric-value">—</div><div className="metric-trend">No delivery log connected</div></div></div>
      </div>
      <div className="grid-2"><div className="nm-section"><h3>Recent activity</h3><p className="sub-text">No notification activity has been recorded.</p></div><div className="nm-section"><h3>Automation rules</h3><p className="sub-text">No automation rules are configured.</p></div></div>
    </div>
  );
  const renderCompose = () => (
    <div className="nm-view fade-in">
       <div className="nm-header">
        <div>
          <h2 className="nm-title">Compose Message</h2>
          <p className="nm-subtitle">Open a reviewed email or WhatsApp draft. Delivery providers are not connected, so messages are never marked as sent here.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="nm-section">
          <h3>Message Details</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="form-group">
              <label>Select Channel *</label>
              <div style={{display:'flex', gap:'1rem', marginTop:'0.5rem'}}>
                <label style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><input type="radio" name="channel" checked={channel === 'Email'} onChange={() => setChannel('Email')}/> Email</label>
                <label style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><input type="radio" name="channel" checked={channel === 'WhatsApp'} onChange={() => setChannel('WhatsApp')}/> WhatsApp</label>
                <label style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><input type="radio" name="channel" checked={channel === 'SMS'} onChange={() => setChannel('SMS')}/> SMS</label>
              </div>
            </div>
            
            <div className="form-group">
              <label>Recipient(s) *</label>
              <input type="text" value={recipient} onChange={event => setRecipient(event.target.value)} placeholder={channel === 'Email' ? 'Customer email address' : 'Customer phone number'} />
            </div>

            <div className="form-group">
              <label>Template (Optional)</label>
              <select>
                <option>None (Custom Message)</option>
                <option>Payment Reminder</option>
                <option>Outstanding Balance Statement</option>
                <option>Festive Greeting</option>
              </select>
            </div>

            <div className="form-group">
              <label>Subject</label>
              <input type="text" value={subject} onChange={event => setSubject(event.target.value)} placeholder="e.g. Payment reminder" />
            </div>

            <div className="form-group">
              <label>Message Body *</label>
              <textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Write your message. It will open as a draft for you to review."></textarea>
            </div>
            
            <div className="form-group">
              <label>Attachments (PDFs)</label>
              <div style={{border:'1px dashed var(--border-color)', padding:'1rem', textAlign:'center', borderRadius:'8px', background:'var(--bg-color)', color:'var(--text-secondary)'}}>
                <FileText size={24} style={{marginBottom:'0.5rem'}}/>
                <div>Click to browse or drag & drop files</div>
              </div>
            </div>
          </div>
        </div>

        <div className="nm-section">
          <h3>Preview</h3>
          <div style={{marginTop:'1.5rem', background:'var(--bg-color)', border:'1px solid var(--border-color)', borderRadius:'12px', overflow:'hidden'}}>
            <div style={{background:'var(--bg-secondary)', padding:'1rem', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#ef4444'}}></div>
              <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#f59e0b'}}></div>
              <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#10b981'}}></div>
              <span style={{marginLeft:'1rem', fontSize:'0.9rem', color:'var(--text-secondary)'}}>New Message</span>
            </div>
            <div style={{padding:'1.5rem'}}>
              <div style={{marginBottom:'1rem'}}>
                <strong>To:</strong> client@example.com<br/>
                <strong>Subject:</strong> Important Update regarding your account
              </div>
              <hr style={{border:'0', borderTop:'1px solid var(--border-color)', margin:'1rem 0'}}/>
              <div style={{whiteSpace:'pre-wrap', lineHeight:'1.5'}}>
                Type your message here... You can use variables like {'{customer_name}'}
              </div>
            </div>
          </div>

          <div style={{marginTop:'2rem', display:'flex', gap:'1rem'}}>
            <button className="btn-secondary" style={{flex:1}} disabled title="Scheduling service is not configured"><Clock size={16}/> Scheduling unavailable</button>
            <button className="btn-primary rainbow-bg" style={{flex:2}} onClick={openDraft}><Send size={16}/> Open {channel} Draft</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="nm-view fade-in">
       <div className="nm-header">
        <div>
          <h2 className="nm-title">Notification Templates</h2>
          <p className="nm-subtitle">Example message templates. Editing and saved template delivery are not configured yet</p>
        </div>
        <button className="btn-primary rainbow-bg" disabled title="Template storage is not configured"><Plus size={16}/> Templates are examples</button>
      </div>

      <div style={{display:'flex', gap:'1rem', marginBottom:'1rem'}}>
        <button className="btn-secondary active">All Templates</button>
        <button className="btn-secondary"><Mail size={16}/> Email</button>
        <button className="btn-secondary"><MessageCircle size={16}/> WhatsApp</button>
        <button className="btn-secondary"><MessageSquare size={16}/> SMS</button>
      </div>

      <div className="grid-3">
        <div className="template-card">
          <div className="template-header">
            <div>
              <span className="channel-pill email"><Mail size={12}/> Email</span>
              <h3 style={{marginTop:'0.5rem'}}>Invoice Sent</h3>
            </div>
            <div style={{display:'flex', gap:'0.5rem'}}>
              <button className="action-btn"><Edit size={16}/></button>
              <button className="action-btn" style={{color:'#ef4444'}}><Trash2 size={16}/></button>
            </div>
          </div>
          <div className="template-preview">
Subject: Invoice <span className="variable-tag">{'{invoice_number}'}</span> from <span className="variable-tag">{'{company_name}'}</span>

Dear <span className="variable-tag">{'{customer_name}'}</span>,

Please find attached Invoice <span className="variable-tag">{'{invoice_number}'}</span>.
Amount: ₹<span className="variable-tag">{'{invoice_amount}'}</span>
Due Date: <span className="variable-tag">{'{due_date}'}</span>

Thank You.
          </div>
        </div>

        <div className="template-card">
          <div className="template-header">
            <div>
              <span className="channel-pill whatsapp"><MessageCircle size={12}/> WhatsApp</span>
              <h3 style={{marginTop:'0.5rem'}}>Payment Reminder</h3>
            </div>
            <div style={{display:'flex', gap:'0.5rem'}}>
              <button className="action-btn"><Edit size={16}/></button>
              <button className="action-btn" style={{color:'#ef4444'}}><Trash2 size={16}/></button>
            </div>
          </div>
          <div className="template-preview">
Hello <span className="variable-tag">{'{customer_name}'}</span>,

Friendly reminder that your Invoice <span className="variable-tag">{'{invoice_number}'}</span> for ₹<span className="variable-tag">{'{invoice_amount}'}</span> is due on <span className="variable-tag">{'{due_date}'}</span>.

Pay securely here: <span className="variable-tag">{'{payment_link}'}</span>

Thank You.
          </div>
        </div>

        <div className="template-card">
          <div className="template-header">
            <div>
              <span className="channel-pill sms"><MessageSquare size={12}/> SMS</span>
              <h3 style={{marginTop:'0.5rem'}}>Payment Confirmed</h3>
            </div>
            <div style={{display:'flex', gap:'0.5rem'}}>
              <button className="action-btn"><Edit size={16}/></button>
              <button className="action-btn" style={{color:'#ef4444'}}><Trash2 size={16}/></button>
            </div>
          </div>
          <div className="template-preview">
Success! Payment of ₹<span className="variable-tag">{'{amount_received}'}</span> received for Inv <span className="variable-tag">{'{invoice_number}'}</span>.
Balance: ₹<span className="variable-tag">{'{balance_amount}'}</span>
- <span className="variable-tag">{'{company_name}'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAutomation = () => (
    <div className="nm-view fade-in"><div className="nm-header"><div><h2 className="nm-title">Automation & Workflows</h2><p className="nm-subtitle">Configured notification rules will appear here.</p></div></div><div className="nm-section"><p className="sub-text">No automation rules have been saved.</p></div></div>
  );
  const renderLogs = () => (
    <div className="nm-view fade-in"><div className="nm-header"><div><h2 className="nm-title">Notification Logs</h2><p className="nm-subtitle">Message delivery history will appear when a provider is connected.</p></div></div><div className="nm-section"><p className="sub-text">No delivery records found.</p></div></div>
  );
  return (
    <div className="notifications-management-wrapper">
      {activeTab === 'dashboard' && (
        <div className="nm-header" style={{paddingBottom:0, borderBottom:'none', marginBottom:'1rem'}}>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
        </div>
      )}
      
      <div className="tabs-simple">
        <button className={`tab-simple ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Overview</button>
        <button className={`tab-simple ${activeTab === 'compose' ? 'active' : ''}`} onClick={() => setActiveTab('compose')}>Compose & Send</button>
        <button className={`tab-simple ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>Templates</button>
        <button className={`tab-simple ${activeTab === 'automation' ? 'active' : ''}`} onClick={() => setActiveTab('automation')}>Automation Rules</button>
        <button className={`tab-simple ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>Delivery Logs</button>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'compose' && renderCompose()}
      {activeTab === 'templates' && renderTemplates()}
      {activeTab === 'automation' && renderAutomation()}
      {activeTab === 'logs' && renderLogs()}
    </div>
  );
}
