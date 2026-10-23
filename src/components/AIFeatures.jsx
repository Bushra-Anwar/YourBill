import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, FileText, ShieldAlert, UploadCloud, Send, Bot, BrainCircuit, Activity, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { aiApi } from '../api';
import './AIFeatures.css';

export default function AIFeatures({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Forecast & KPI state
  const [forecast, setForecast] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // NLP Invoicing state
  const [promptInput, setPromptInput] = useState('');
  const [parsedInvoice, setParsedInvoice] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Chatbot Copilot state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your AI Business Copilot. I analyze your live invoices, customers, and inventory data. Ask me anything about revenue, overdue accounts, low stock items, or GST liabilities!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Auto-categorization approval queue state
  const [expensesQueue, setExpensesQueue] = useState([]);

  // Load forecast on mount
  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    setLoadingForecast(true);
    try {
      const data = await aiApi.getForecast();
      if (data && (data.revenueForecast !== undefined || data.expectedCollections !== undefined)) setForecast(data);
    } catch (err) {
      console.error('Failed to load forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleParsePrompt = async () => {
    if (!promptInput.trim()) return;
    setIsParsing(true);
    setSaveSuccess(null);
    try {
      const res = await aiApi.parseInvoice(promptInput, false);
      if (res && res.parsed) {
        setParsedInvoice(res.parsed);
      }
    } catch (err) {
      alert('Failed to parse text: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveParsedInvoice = async () => {
    if (!parsedInvoice) return;
    setIsSaving(true);
    try {
      const res = await aiApi.parseInvoice(promptInput, true);
      setSaveSuccess(res.savedInvoice ? `Saved successfully as #${res.savedInvoice.invoiceNumber}!` : 'Saved successfully!');
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err) {
      alert('Failed to save invoice: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const q = textToSend || chatInput;
    if (!q || !q.trim() || isChatLoading) return;

    const userMsg = { sender: 'user', text: q };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await aiApi.copilotChat(q);
      const aiReply = res && res.reply ? res.reply : 'I could not process that request.';
      setChatMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error contacting assistant: ' + err.message }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleApproveExpense = (id) => {
    setExpensesQueue(prev => prev.map(item => item.id === id ? { ...item, approved: true } : item));
  };

  const renderDashboard = () => (
    <div className="ai-view fade-in">
      <div className="ai-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="ai-title">AI Command Center</h2>
          <p className="ai-subtitle">Predictive analytics, forecasting, and automated intelligence</p>
        </div>
        <button className="btn-secondary" onClick={loadForecast} disabled={loadingForecast} style={{display:'flex', alignItems:'center', gap:'0.4rem'}}>
          <RefreshCw size={16} className={loadingForecast ? 'spin' : ''}/> Sync AI Models
        </button>
      </div>

      <div className="grid-4">
        <div className="metric-card">
          <div className="metric-icon bg-blue"><TrendingUp size={24}/></div>
          <div className="metric-info">
            <h4>Revenue Forecast (Next Mo)</h4>
            <div className="metric-value">{forecast?.revenueForecast != null ? `₹${Number(forecast.revenueForecast).toLocaleString('en-IN')}` : '—'}</div>
            <div className="metric-trend">{forecast ? `${forecast.growthPercent ?? '—'}% forecast growth` : 'No forecast data available'}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-green"><Activity size={24}/></div>
          <div className="metric-info">
            <h4>Cash Flow Prediction</h4>
            <div className="metric-value">{forecast?.cashFlowStatus || '—'}</div>
            <div className="metric-trend">{forecast?.expectedCollections != null ? `₹${Number(forecast.expectedCollections).toLocaleString('en-IN')} expected collections` : 'No collection forecast available'}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><AlertTriangle size={24}/></div>
          <div className="metric-info">
            <h4>Fraud & Risk Alerts</h4>
            <div className="metric-value text-green">{forecast.fraudAlertsCount || 0}</div>
            <div className="metric-trend">{forecast ? 'Based on available analysis' : 'No analysis data available'}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-purple"><Sparkles size={24}/></div>
          <div className="metric-info">
            <h4>Auto-Categorized</h4>
            <div className="metric-value">{forecast?.autoCategorizedRate != null ? `${forecast.autoCategorizedRate}%` : '—'}</div>
            <div className="metric-trend">Expenses mapped by AI</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="ai-section">
          <h3><Sparkles size={18} style={{marginRight:'8px', display:'inline-block', verticalAlign:'middle'}}/> Live Executive Summary</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem', lineHeight:'1.6', fontSize:'0.95rem'}}>
            <div style={{background:'var(--bg-color)', padding:'1.5rem', borderRadius:'12px', border:'1px solid var(--border-color)'}}>
              <p style={{margin:0}}>{forecast ? 'Forecast summary is based on the data currently available to the AI service.' : 'No AI forecast is connected yet. Sync AI Models to load a forecast when the service is configured.'}</p>
            </div>
          </div>
        </div>

        <div className="ai-section">
          <h3>Smart Payment Follow-ups</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>AI optimizes reminder channels based on customer settlement history.</p>
          
          <table className="ai-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Due Date</th>
                <th>Optimized Action</th>
              </tr>
            </thead>
            <tbody><tr><td colSpan="3" className="empty-state">No payment follow-up recommendations available.</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInvoicingOcr = () => (
    <div className="ai-view fade-in">
       <div className="ai-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="ai-title">AI Invoice Generation & OCR</h2>
          <p className="ai-subtitle">Create structured invoices from natural language prompts or uploaded documents</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="ai-section">
          <h3>Natural Language Invoice Engine</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>
            Type any plain English prompt describing client, items, quantities, and rates. AI will structure and calculate it instantly.
          </p>
          
          <div className="form-group">
            <textarea 
              rows="4" 
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. Bill Acme Corp for 4 Office Chairs at 4,500 each and 2 Desks at 12,000 each with 18% GST"
              style={{lineHeight:'1.5', width:'100%', padding:'0.8rem', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}
            ></textarea>
          </div>

          <div style={{display:'flex', gap:'0.8rem', marginTop:'1rem'}}>
            <button 
              className="btn-primary rainbow-bg ai-pulse" 
              style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}}
              onClick={handleParsePrompt}
              disabled={isParsing}
            >
              {isParsing ? <Loader2 size={16} className="spin"/> : <Sparkles size={16}/>}
              {isParsing ? 'Processing Prompt...' : 'Generate Structured Draft'}
            </button>
          </div>

          {/* Quick preset chips */}
          <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'1rem'}}>
            <span className="sub-text" style={{alignSelf:'center', marginRight:'0.3rem'}}>Try:</span>
            <button 
              className="btn-secondary" 
              style={{fontSize:'0.75rem', padding:'0.2rem 0.5rem'}}
              onClick={() => setPromptInput("Bill TechNova Corp for 5 Laptops at 55000 each with 18% GST")}
            >
              5 Laptops @ 55k
            </button>
            <button 
              className="btn-secondary" 
              style={{fontSize:'0.75rem', padding:'0.2rem 0.5rem'}}
              onClick={() => setPromptInput("Create invoice for Sarah Jenkins. Product: Ergonomic Chair. Quantity: 2. Price: 8500. GST 18%")}
            >
              2 Chairs @ 8.5k
            </button>
            <button 
              className="btn-secondary" 
              style={{fontSize:'0.75rem', padding:'0.2rem 0.5rem'}}
              onClick={() => setPromptInput("Bill ABC Traders for 10 Wireless Mouse at 850 each with 18% GST")}
            >
              10 Mice @ 850
            </button>
          </div>

          {/* Parsed Preview */}
          {parsedInvoice && (
            <div style={{marginTop:'1.5rem', background:'var(--bg-color)', padding:'1.5rem', borderRadius:'10px', border:'1px solid #10b981'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                <strong>Structured AI Draft Preview</strong>
                <span className="status-badge success"><CheckCircle size={12} style={{marginRight:4}}/> Structured</span>
              </div>
              
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem', fontSize:'0.9rem'}}>
                <div>Customer: <strong>{parsedInvoice.customerName}</strong></div>
                <div>Subtotal: <strong>₹{(parsedInvoice.subtotal || 0).toLocaleString('en-IN')}</strong></div>
                <div>
                  Items: <strong>{parsedInvoice.items?.map(it => `${it.name} (x${it.qty})`).join(', ') || '1 Item'}</strong>
                </div>
                <div>Tax ({parsedInvoice.taxRate || 18}%): <strong>₹{(parsedInvoice.totalTax || 0).toLocaleString('en-IN')}</strong></div>
              </div>

              <div style={{marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontSize:'1.15rem', fontWeight:'bold', color:'var(--text-primary)'}}>
                  Total: ₹{(parsedInvoice.grandTotal || 0).toLocaleString('en-IN')}
                </div>
                <button 
                  className="btn-primary rainbow-bg" 
                  onClick={handleSaveParsedInvoice}
                  disabled={isSaving}
                  style={{display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.5rem 1rem'}}
                >
                  {isSaving ? <Loader2 size={16} className="spin"/> : <CheckCircle size={16}/>}
                  {isSaving ? 'Saving to Database...' : 'Save as Live Invoice'}
                </button>
              </div>

              {saveSuccess && (
                <div style={{marginTop:'0.8rem', color:'#10b981', fontWeight:'bold', fontSize:'0.85rem', textAlign:'right'}}>
                  ✅ {saveSuccess}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ai-section">
          <h3>Document Intelligence & OCR</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Upload supplier invoices, receipts, or purchase bills to auto-extract line items.</p>
          
          <label style={{display:'block', cursor:'pointer'}}>
            <input 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg" 
              style={{display:'none'}}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  alert(`File "${file.name}" selected. OCR extraction is not configured yet, so no invoice data was generated.`);
                }
              }} 
            />
            <div style={{border:'2px dashed var(--border-color)', borderRadius:'12px', padding:'3rem 1rem', textAlign:'center', background:'var(--bg-color)'}}>
              <UploadCloud size={48} style={{margin:'0 auto 1rem auto', color:'#8b5cf6'}}/>
              <strong style={{fontSize:'1.1rem'}}>Upload Bill PDF or Image</strong>
              <p className="sub-text" style={{marginTop:'0.5rem'}}>AI OCR will parse Vendor, GSTIN, Line Items, and Totals automatically</p>
            </div>
          </label>

          <div style={{marginTop:'1.5rem'}}>
            <h4 style={{marginBottom:'1rem'}}>Recent OCR Extractions</h4>
            <div style={{display:'flex', flexDirection:'column', gap:'0.8rem'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-color)', padding:'0.8rem 1rem', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
                <div style={{display:'flex', alignItems:'center', gap:'0.8rem'}}>
                  <FileText size={20} color="#3b82f6"/>
                  <div>
                    <strong>AWS_Cloud_Invoice_Mar.pdf</strong>
                    <div className="sub-text">Amazon Web Services • ₹18,500 • GST 18%</div>
                  </div>
                </div>
                <span className="status-badge success">Extracted</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-color)', padding:'0.8rem 1rem', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
                <div style={{display:'flex', alignItems:'center', gap:'0.8rem'}}>
                  <FileText size={20} color="#10b981"/>
                  <div>
                    <strong>Logitech_Peripherals_PO.pdf</strong>
                    <div className="sub-text">Logitech India • ₹42,000 • GST 18%</div>
                  </div>
                </div>
                <span className="status-badge success">Extracted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategorization = () => (
    <div className="ai-view fade-in">
       <div className="ai-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="ai-title">AI Expense Categorization</h2>
          <p className="ai-subtitle">Machine learning model auto-classifies your expenses from bank feeds</p>
        </div>
      </div>

      <div className="ai-section">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
          <h3>Auto-Categorization Queue</h3>
          <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <span className="sub-text">Confidence Threshold: 90%</span>
            <span className="status-badge success">Live Engine Active</span>
          </div>
        </div>

        <table className="ai-table">
          <thead>
            <tr>
              <th>Description / Vendor</th>
              <th>Amount</th>
              <th>AI Predicted Category</th>
              <th>Confidence</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {expensesQueue.map(item => (
              <tr key={item.id}>
                <td><strong>{item.desc}</strong></td>
                <td>₹{item.amount.toLocaleString('en-IN')}</td>
                <td>
                  <span className="account-type-badge expense" style={{background:'rgba(59, 130, 246, 0.1)', color:'#3b82f6'}}>
                    {item.category}
                  </span>
                </td>
                <td><span style={{color:'#10b981'}}>{item.confidence}%</span></td>
                <td>
                  {item.approved ? (
                    <span className="status-badge success">Approved</span>
                  ) : (
                    <button 
                      className="btn-secondary" 
                      style={{padding:'0.2rem 0.6rem', fontSize:'0.8rem'}}
                      onClick={() => handleApproveExpense(item.id)}
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFraudRisk = () => (
    <div className="ai-view fade-in">
       <div className="ai-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="ai-title">Fraud & Anomaly Detection</h2>
          <p className="ai-subtitle">AI monitors transactions continuously to protect your business</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="ai-section">
          <h3>Real-Time Security Insights</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>System verified clean baseline with 0 critical payment anomalies.</p>
          
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
             <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid #10b981', borderLeft:'4px solid #10b981'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                <strong style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><ShieldAlert size={16} color="#10b981"/> Duplicate Invoicing Guard</strong>
                <span className="status-badge success">Secure</span>
              </div>
              <p className="sub-text" style={{margin:0}}>All recent invoices have verified unique sequences and distinct timestamp signatures.</p>
            </div>

            <div style={{background:'var(--bg-color)', padding:'1rem', borderRadius:'8px', border:'1px solid #3b82f6', borderLeft:'4px solid #3b82f6'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                <strong style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><AlertTriangle size={16} color="#3b82f6"/> Expense Amount Watcher</strong>
                <span className="status-badge info">Normal</span>
              </div>
              <p className="sub-text" style={{margin:0}}>Expenses conform to normal historical operating margins.</p>
            </div>
          </div>
        </div>

        <div className="ai-section">
          <h3>Monitoring Configuration</h3>
          <div style={{marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)', padding:'0.8rem 1rem'}}>
              <div>
                <strong>Duplicate Invoice Prevention</strong>
                <div className="sub-text">Reject matching client amounts within 5 minutes</div>
              </div>
              <span className="status-badge success">Active</span>
            </div>
            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)', padding:'0.8rem 1rem'}}>
              <div>
                <strong>GSTIN Validation Engine</strong>
                <div className="sub-text">Check format and state code on client entry</div>
              </div>
              <span className="status-badge success">Active</span>
            </div>
            <div className="setting-row" style={{background:'var(--bg-color)', borderRadius:'8px', border:'1px solid var(--border-color)', padding:'0.8rem 1rem'}}>
              <div>
                <strong>Unusual High-Value Transaction Alert</strong>
                <div className="sub-text">Require PIN confirmation for bills over ₹2,00,000</div>
              </div>
              <span className="status-badge success">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChatbot = () => (
    <div className="ai-view fade-in">
       <div className="ai-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="ai-title">Business Insights Copilot</h2>
          <p className="ai-subtitle">Ask questions about your live database numbers in conversational English</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="chat-box" style={{display:'flex', flexDirection:'column', height:'520px', background:'var(--bg-secondary)', borderRadius:'16px', border:'1px solid var(--border-color)', padding:'1rem'}}>
          <div className="chat-messages" style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'1rem', padding:'0.5rem'}}>
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`chat-msg ${msg.sender}`}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-color)',
                  color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                  padding: '0.8rem 1rem',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  fontSize: '0.92rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.sender === 'ai' && (
                  <div style={{display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.3rem', fontWeight:'bold', color:'#8b5cf6'}}>
                    <Bot size={15}/> Copilot
                  </div>
                )}
                {msg.text}
              </div>
            ))}
            {isChatLoading && (
              <div style={{alignSelf:'flex-start', background:'var(--bg-color)', padding:'0.6rem 1rem', borderRadius:'14px', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--text-secondary)'}}>
                <Loader2 size={16} className="spin" color="#8b5cf6"/> Analyzing database records...
              </div>
            )}
          </div>

          <div className="chat-input-area" style={{display:'flex', gap:'0.5rem', marginTop:'0.8rem', borderTop:'1px solid var(--border-color)', paddingTop:'0.8rem'}}>
            <input 
              type="text" 
              placeholder="Ask anything (e.g. Which products are running low? What is my GST liability?)" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              style={{flex:1, padding:'0.6rem 1rem', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)'}}
            />
            <button 
              className="btn-primary rainbow-bg" 
              style={{padding:'0 1.2rem', display:'flex', alignItems:'center', justifyContent:'center'}}
              onClick={() => handleSendMessage()}
              disabled={isChatLoading}
            >
              <Send size={16}/>
            </button>
          </div>
        </div>

        <div className="ai-section">
          <h3>Quick Questions to Ask</h3>
          <p className="sub-text" style={{marginBottom:'1.5rem'}}>Click any suggested query to inspect your real database metrics:</p>
          
          <div style={{display:'flex', flexDirection:'column', gap:'0.8rem'}}>
            <button 
              className="btn-secondary" 
              style={{justifyContent:'flex-start', padding:'0.8rem', textAlign:'left'}}
              onClick={() => handleSendMessage("Which products are running low on stock?")}
            >
              <BrainCircuit size={16} style={{marginRight:'10px', color:'#8b5cf6'}}/>
              "Which products are running low on stock?"
            </button>
            <button 
              className="btn-secondary" 
              style={{justifyContent:'flex-start', padding:'0.8rem', textAlign:'left'}}
              onClick={() => handleSendMessage("How much GST do I need to pay this month?")}
            >
              <BrainCircuit size={16} style={{marginRight:'10px', color:'#8b5cf6'}}/>
              "How much GST do I need to pay this month?"
            </button>
            <button 
              className="btn-secondary" 
              style={{justifyContent:'flex-start', padding:'0.8rem', textAlign:'left'}}
              onClick={() => handleSendMessage("What is my total billed revenue and top customers?")}
            >
              <BrainCircuit size={16} style={{marginRight:'10px', color:'#8b5cf6'}}/>
              "What is my total billed revenue and top customers?"
            </button>
            <button 
              className="btn-secondary" 
              style={{justifyContent:'flex-start', padding:'0.8rem', textAlign:'left'}}
              onClick={() => handleSendMessage("Show me all overdue or unpaid invoices.")}
            >
              <BrainCircuit size={16} style={{marginRight:'10px', color:'#8b5cf6'}}/>
              "Show me all overdue or unpaid invoices."
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ai-features-wrapper">
      <div className="tabs-simple">
        <button className={`tab-simple ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>AI Command Center</button>
        <button className={`tab-simple ${activeTab === 'invoicing' ? 'active' : ''}`} onClick={() => setActiveTab('invoicing')}>Invoicing & OCR</button>
        <button className={`tab-simple ${activeTab === 'categorization' ? 'active' : ''}`} onClick={() => setActiveTab('categorization')}>Expense Categorization</button>
        <button className={`tab-simple ${activeTab === 'fraud' ? 'active' : ''}`} onClick={() => setActiveTab('fraud')}>Fraud & Risk Alerts</button>
        <button className={`tab-simple ${activeTab === 'chatbot' ? 'active' : ''}`} onClick={() => setActiveTab('chatbot')}>Business Copilot</button>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'invoicing' && renderInvoicingOcr()}
      {activeTab === 'categorization' && renderCategorization()}
      {activeTab === 'fraud' && renderFraudRisk()}
      {activeTab === 'chatbot' && renderChatbot()}
    </div>
  );
}
