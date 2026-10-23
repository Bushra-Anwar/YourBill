import { useState } from 'react';
import { FileText, Printer, PenTool, QrCode, Image as ImageIcon, Shield, FilePlus, Zap } from 'lucide-react';
import './DocumentManagement.css';

export default function DocumentManagement({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [templateType, setTemplateType] = useState('A4');

  const renderDashboard = () => (
    <div className="dm-view fade-in">
      <div className="dm-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
          <h2 className="dm-title">Document Features</h2>
          <p className="dm-subtitle">Manage PDF generation, printing, branding, and digital signatures</p>
        </div>
        <div style={{display:'flex', gap:'1rem'}}>
          <button className="btn-secondary" onClick={() => window.print()}><Printer size={16}/> Print this page</button>
          <button className="btn-primary rainbow-bg" onClick={() => setActiveTab('branding')}><FilePlus size={16} /> Browse Templates</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="metric-card">
          <div className="metric-icon bg-blue"><FileText size={24}/></div>
          <div className="metric-info">
            <h4>PDFs Generated</h4>
            <div className="metric-value">—</div>
            <div className="metric-trend">Generation activity is not tracked</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-green"><Printer size={24}/></div>
          <div className="metric-info">
            <h4>Invoices Printed</h4>
            <div className="metric-value">—</div>
            <div className="metric-trend">Print activity is not tracked</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-purple"><PenTool size={24}/></div>
          <div className="metric-info">
            <h4>Digitally Signed</h4>
            <div className="metric-value">—</div>
            <div className="metric-trend">Digital signing is not configured</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><QrCode size={24}/></div>
          <div className="metric-info">
            <h4>QR & Barcodes</h4>
            <div className="metric-value">—</div>
            <div className="metric-trend">Code generation activity is not tracked</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="dm-section">
          <h3>Recent Document History</h3>
          <table className="dm-table" style={{marginTop:'1rem'}}>
            <thead>
              <tr>
                <th>Document</th>
                <th>Action</th>
                <th>User</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody><tr><td colSpan="4" className="empty-state">Document activity will appear here when you generate or print a document.</td></tr></tbody>
          </table>
          <button className="btn-secondary" style={{width:'100%', marginTop:'1rem'}} disabled title="Document history is not stored by the app yet">History unavailable</button>
        </div>

        <div className="dm-section">
          <h3>Quick Actions & Settings</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                <div className="metric-icon bg-blue" style={{width:'40px', height:'40px'}}><FileText size={20}/></div>
                <div>
                  <strong>Default PDF Size</strong>
                  <div className="sub-text">Current: A4 (Portrait)</div>
                </div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}} onClick={() => setActiveTab('branding')}>Choose layout</button>
            </div>
            
            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                <div className="metric-icon bg-green" style={{width:'40px', height:'40px'}}><Printer size={20}/></div>
                <div>
                  <strong>Thermal Printer</strong>
                  <div className="sub-text">Status: Use your browser print dialog</div>
                </div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}} onClick={() => window.print()}>Print test</button>
            </div>

            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                <div className="metric-icon bg-purple" style={{width:'40px', height:'40px'}}><ImageIcon size={20}/></div>
                <div>
                  <strong>Company Logo</strong>
                  <div className="sub-text">Visible on all templates</div>
                </div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}} disabled title="Logo upload is not connected to business settings">Logo upload unavailable</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBranding = () => (
    <div className="dm-view fade-in">
       <div className="dm-header">
        <div>
          <h2 className="dm-title">Invoice Templates</h2>
          <p className="dm-subtitle">Choose a professional design for your invoices</p>
        </div>
      </div>

      <div className="template-type-tabs">
        <button className={`type-btn ${templateType === 'Thermal' ? 'active' : ''}`} onClick={() => setTemplateType('Thermal')}>Thermal Prints</button>
        <button className={`type-btn ${templateType === 'A4' ? 'active' : ''}`} onClick={() => setTemplateType('A4')}>A4 Prints</button>
        <button className={`type-btn ${templateType === 'A5' ? 'active' : ''}`} onClick={() => setTemplateType('A5')}>A5 Prints</button>
      </div>

      <div className="invoice-templates-grid">
        <div className="invoice-preview-card">
          <div className="invoice-mockup style-1">
             <div className="mockup-header">
          <div className="mockup-logo">•••</div>
               <div className="mockup-company">
                 <h4>Your Business</h4>
                 <p>Business address</p>
                 <p style={{fontSize:'0.5rem', color:'#888'}}>GSTIN</p>
               </div>
               <div className="mockup-title">TAX INVOICE</div>
             </div>
             <div className="mockup-body">
                <div className="mockup-line"></div>
                <div className="mockup-line short"></div>
                <div className="mockup-table">
                  <div className="m-th" style={{background:'#fcf8e3'}}></div>
                  <div className="m-tr"></div>
                  <div className="m-tr"></div>
                  <div className="m-tr"></div>
                </div>
                <div className="mockup-total">Total: —</div>
                <div style={{marginTop:'2rem', fontSize:'0.45rem', color:'#666'}}>
                  <p>Terms & Conditions:</p>
                  <p>1. Payment is due at the time of purchase.</p>
                  <p>2. Goods once sold cannot be returned.</p>
                </div>
             </div>
          </div>
          <div className="preview-overlay">
            <button className="btn-primary rainbow-bg" disabled title="Template selection is not connected to invoice generation">Template application unavailable</button>
          </div>
        </div>

        <div className="invoice-preview-card">
          <div className="invoice-mockup style-2">
             <div className="watermark">⚕️</div>
             <div className="mockup-header centered">
               <h4>Your Business</h4>
               <p>Business address</p>
               <p style={{fontSize:'0.5rem', color:'#888'}}>Business registration</p>
             </div>
             <div className="mockup-body">
                <div className="mockup-line" style={{marginTop:'1rem'}}></div>
                <div className="mockup-table bordered">
                  <div className="m-th" style={{background:'#eef2ff'}}></div>
                  <div className="m-tr"></div>
                  <div className="m-tr"></div>
                  <div className="m-tr"></div>
                  <div className="m-tr"></div>
                </div>
                <div className="mockup-total">Total: —</div>
             </div>
          </div>
          <div className="preview-overlay">
            <button className="btn-primary rainbow-bg" disabled title="Template selection is not connected to invoice generation">Template application unavailable</button>
          </div>
        </div>

        <div className="invoice-preview-card customize-card">
          <div className="customize-content">
             <div className="customize-icon">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
             </div>
             <h3>Customize your own Invoice</h3>
             <p>Change colors, fonts, and layout</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPdfPrint = () => (
    <div className="dm-view fade-in">
       <div className="dm-header">
        <div>
          <h2 className="dm-title">PDF Generation & Printing</h2>
          <p className="dm-subtitle">Configure PDF layouts and hardware printer integrations</p>
        </div>
        <button className="btn-primary rainbow-bg" disabled title="Bulk PDF export is not implemented"><Zap size={16}/> Bulk export unavailable</button>
      </div>

      <div className="grid-2">
        <div className="dm-section">
          <h3>PDF Settings</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="setting-row">
              <div>
                <strong>Page Size</strong>
                <div className="sub-text">Standard document size</div>
              </div>
              <select disabled style={{padding:'0.5rem', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}>
                <option>A4</option>
                <option>Letter</option>
                <option>Legal</option>
              </select>
            </div>
            <div className="setting-row">
              <div>
                <strong>Orientation</strong>
                <div className="sub-text">Portrait or Landscape</div>
              </div>
              <select disabled style={{padding:'0.5rem', borderRadius:'6px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}>
                <option>Portrait</option>
                <option>Landscape</option>
              </select>
            </div>
            <div className="setting-row">
              <div>
                <strong>Auto PDF Generation</strong>
                <div className="sub-text">PDF generation settings are not stored here</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
            <div className="setting-row">
              <div>
                <strong>Attach PDF to Emails</strong>
                <div className="sub-text">Email/PDF delivery is not configured</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
          </div>
        </div>

        <div className="dm-section">
          <h3>Hardware & Printing</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="setting-row">
              <div>
                <strong>A4 / Desk Printer</strong>
                <div className="sub-text">Use the browser print dialog</div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}} onClick={() => window.print()}>Print page</button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Thermal Receipt Printer (POS)</strong>
                <div className="sub-text">Use the browser print dialog</div>
              </div>
              <button className="btn-secondary" style={{padding:'0.4rem 0.8rem'}} onClick={() => window.print()}>Print page</button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Barcode Label Printer</strong>
                <div className="sub-text">Not Connected</div>
              </div>
              <button className="btn-secondary" disabled title="No barcode printer setup integration is available" style={{padding:'0.4rem 0.8rem'}}>Setup unavailable</button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Silent Printing (No Dialog)</strong>
                <div className="sub-text">Requires browser extension</div>
              </div>
              <div className="toggle-switch"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSignaturesSecurity = () => (
    <div className="dm-view fade-in">
       <div className="dm-header">
        <div>
          <h2 className="dm-title">Signatures & Security</h2>
          <p className="dm-subtitle">Digital signing, password protection, and tamper detection</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="dm-section">
          <h3>Digital Signatures</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="upload-area" style={{padding:'1rem'}}>
              <PenTool size={24}/>
              <p>Upload PNG Signature or Draw</p>
            </div>
            <div style={{marginTop:'1rem', padding:'1rem', background:'white', borderRadius:'8px', display:'flex', justifyContent:'center'}}>
              {/* Mock signature drawing */}
              <svg width="200" height="50" viewBox="0 0 200 50">
                <path d="M10,40 Q30,10 60,30 T120,20 T180,35" fill="none" stroke="#000" strokeWidth="2"/>
                <path d="M40,45 L160,45" fill="none" stroke="#999" strokeWidth="1" strokeDasharray="4 4"/>
              </svg>
            </div>
            <div className="setting-row" style={{padding:'1rem 0'}}>
              <span>Auto-Apply to Invoices</span>
              <span className="sub-text">Not configured</span>
            </div>
            <div className="setting-row" style={{padding:'1rem 0'}}>
              <span>Auto-Apply to Purchase Orders</span>
              <div className="toggle-switch on"></div>
            </div>
            <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)', marginTop:'1rem', display:'flex', alignItems:'center', gap:'0.5rem', color:'#10b981'}}>
              <Shield size={16}/> <span>Digital signature provider not configured</span>
            </div>
          </div>
        </div>

        <div className="dm-section">
          <h3>Document Security (PDF)</h3>
          <div style={{marginTop:'1.5rem'}}>
            <div className="setting-row">
              <div>
                <strong>Password Protection</strong>
                <div className="sub-text">Require password to open PDF</div>
              </div>
              <div className="toggle-switch"></div>
            </div>
            <div className="setting-row" style={{opacity: 0.5}}>
              <div>
                <strong>Default Password Format</strong>
                <div className="sub-text">e.g. Customer PAN + Phone</div>
              </div>
              <select disabled style={{padding:'0.4rem', borderRadius:'6px', border:'1px solid var(--border-color)'}}>
                <option>Custom Rule</option>
              </select>
            </div>
            <div className="setting-row">
              <div>
                <strong>Lock After Generation (Read-Only)</strong>
                <div className="sub-text">Prevent editing of generated PDFs</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
            <div className="setting-row">
              <div>
                <strong>Disable Copy/Print</strong>
                <div className="sub-text">Set PDF DRM permissions</div>
              </div>
              <div className="toggle-switch"></div>
            </div>
            <div className="setting-row">
              <div>
                <strong>Tamper Detection Hash</strong>
                <div className="sub-text">Store SHA-256 hash in DB</div>
              </div>
              <span className="sub-text">Unavailable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQrBarcodes = () => (
    <div className="dm-view fade-in">
       <div className="dm-header">
        <div>
          <h2 className="dm-title">QR & Barcodes</h2>
          <p className="dm-subtitle">Generate payment QRs, invoice verification codes, and product barcodes</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="dm-section">
          <h3>QR Code Generation</h3>
          <div style={{marginTop:'1.5rem', display:'flex', gap:'1.5rem'}}>
            <div className="qr-preview">
              <QrCode size={100} color="#000"/>
              <span style={{fontSize:'0.8rem', fontWeight:'bold'}}>UPI Payment</span>
            </div>
            <div style={{flex:1, display:'flex', flexDirection:'column', gap:'1rem'}}>
              <div className="setting-row" style={{padding:'0.5rem 0'}}>
                <span>Append Payment QR to Invoices</span>
              <span className="sub-text">Unavailable</span>
              </div>
              <div className="setting-row" style={{padding:'0.5rem 0'}}>
                <span>Invoice Verification QR</span>
              <span className="sub-text">Unavailable</span>
              </div>
              <div className="setting-row" style={{padding:'0.5rem 0'}}>
                <span>QR Code Logo Overlay</span>
                <div className="toggle-switch"></div>
              </div>
              <button className="btn-secondary" disabled title="Custom QR creation is not implemented" style={{marginTop:'auto'}}>Custom QR unavailable</button>
            </div>
          </div>
        </div>

        <div className="dm-section">
          <h3>Product Barcodes</h3>
          <div style={{marginTop:'1.5rem', display:'flex', gap:'1.5rem'}}>
            <div style={{display:'flex', flexDirection:'column', gap:'1rem', flex:1}}>
              <div className="form-group">
                <label>Barcode Format</label>
                <select>
                  <option>Code128 (Standard)</option>
                  <option>EAN13 (Retail)</option>
                  <option>UPC</option>
                  <option>Code39</option>
                </select>
              </div>
              <div className="setting-row" style={{padding:'0.5rem 0'}}>
                <span>Auto-generate for new products</span>
                <div className="toggle-switch on"></div>
              </div>
              <button className="btn-secondary" style={{marginTop:'auto'}} onClick={() => window.print()}><Printer size={16}/> Print page</button>
            </div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div className="barcode-preview">
                <div style={{width:'150px', height:'60px', background:'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px, #000 9px, #000 12px, #fff 12px, #fff 13px)', marginBottom:'5px'}}></div>
                <span style={{letterSpacing:'2px'}}>Sample barcode preview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="document-management-wrapper">
      {activeTab === 'dashboard' && (
        <div className="dm-header" style={{paddingBottom:0, borderBottom:'none', marginBottom:'1rem'}}>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
        </div>
      )}
      
      <div className="tabs-simple">
        <button className={`tab-simple ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Overview</button>
        <button className={`tab-simple ${activeTab === 'branding' ? 'active' : ''}`} onClick={() => setActiveTab('branding')}>Branding & Templates</button>
        <button className={`tab-simple ${activeTab === 'print' ? 'active' : ''}`} onClick={() => setActiveTab('print')}>PDF & Print</button>
        <button className={`tab-simple ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Signatures & Security</button>
        <button className={`tab-simple ${activeTab === 'qr' ? 'active' : ''}`} onClick={() => setActiveTab('qr')}>QR & Barcodes</button>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'branding' && renderBranding()}
      {activeTab === 'print' && renderPdfPrint()}
      {activeTab === 'security' && renderSignaturesSecurity()}
      {activeTab === 'qr' && renderQrBarcodes()}
    </div>
  );
}
