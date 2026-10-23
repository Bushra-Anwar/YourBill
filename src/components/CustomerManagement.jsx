import { useState, useEffect } from 'react';
import { Users, UserPlus, CreditCard, FileText, Activity, MapPin, Phone, Mail, Building, Search, Edit, Trash2, Download, Save, X } from 'lucide-react';
import './CustomerManagement.css';
import { customerApi } from '../api';

export default function CustomerManagement({ onBack }) {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, add, profile
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formTab, setFormTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '', type: 'B2B', phone: '', email: '', 
    gst: '', pan: '', website: '', city: '', addressLine1: '', addressLine2: '', state: '', pincode: '',
    creditLimit: 0, currentBalance: 0, creditPeriod: 30, notes: ''
  });

  // Profile state
  const [profileTab, setProfileTab] = useState('overview');

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const data = await customerApi.getAll();
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      name: '', type: 'B2B', phone: '', email: '', 
      gst: '', pan: '', website: '', city: '', addressLine1: '', addressLine2: '', state: '', pincode: '',
      creditLimit: 0, currentBalance: 0, creditPeriod: 30, notes: ''
    });
    setFormTab('basic');
    setActiveView('add');
  };

  const handleOpenEdit = () => {
    if(!selectedCustomer) return;
    setIsEditing(true);
    setFormData({
      name: selectedCustomer.name || '',
      type: selectedCustomer.type || 'B2B',
      phone: selectedCustomer.phone || '',
      email: selectedCustomer.email || '',
      gst: selectedCustomer.gst || '',
      pan: selectedCustomer.pan || '',
      website: selectedCustomer.website || '',
      city: selectedCustomer.city || '',
      addressLine1: selectedCustomer.addressLine1 || '',
      addressLine2: selectedCustomer.addressLine2 || '',
      state: selectedCustomer.state || '',
      pincode: selectedCustomer.pincode || '',
      creditLimit: selectedCustomer.creditLimit || 0,
      currentBalance: selectedCustomer.currentBalance || 0,
      creditPeriod: selectedCustomer.creditPeriod || 30,
      notes: selectedCustomer.notes || ''
    });
    setFormTab('basic');
    setActiveView('add');
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    
    // Convert numbers
    const payload = {
      ...formData,
      creditLimit: Number(formData.creditLimit) || 0,
      currentBalance: Number(formData.currentBalance) || 0,
      creditPeriod: Number(formData.creditPeriod) || 30
    };

    try {
      let savedCust;
      if (isEditing) {
        savedCust = await customerApi.update(selectedCustomer._id, payload);
      } else {
        savedCust = await customerApi.create(payload);
      }

      await fetchCustomers();
      if (isEditing) {
        setSelectedCustomer(savedCust);
        setActiveView('profile');
      } else {
        setActiveView('dashboard');
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      alert(`Failed to save customer: ${error.message}`);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if(!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    try {
      await customerApi.delete(id);
      await fetchCustomers();
      setActiveView('dashboard');
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert(`Error deleting customer: ${error.message}`);
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Name,Type,Phone,Email,City,GST,Credit Limit,Balance,Status\n";
    customers.forEach(c => {
      csvContent += `${c.customerId},${c.name},${c.type},${c.phone},${c.email || ''},${c.city || ''},${c.gst || ''},${c.creditLimit},${c.currentBalance},${c.status}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customers_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered customers for search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.customerId && c.customerId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Metrics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'Active').length;
  const totalOutstanding = customers.reduce((acc, curr) => acc + curr.currentBalance, 0);

  const renderDashboard = () => (
    <div className="cm-dashboard fade-in">
      <div className="cm-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
          <h2 className="cm-title">Customer Intelligence</h2>
          <p className="cm-subtitle">Overview of your customer metrics and directory</p>
        </div>
        <div style={{display:'flex', gap:'1rem'}}>
          <button className="btn-secondary" onClick={handleExportCSV}><Download size={18} /> Export</button>
          <button className="btn-primary rainbow-bg" onClick={handleOpenAdd}>
            <UserPlus size={18} /> Add New Customer
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-blue"><Users size={24} /></div>
          <div className="metric-info">
            <h4>Total Customers</h4>
            <div className="metric-value">{totalCustomers}</div>
            <div className="metric-trend positive">Real-time data</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-green"><Activity size={24} /></div>
          <div className="metric-info">
            <h4>Active Customers</h4>
            <div className="metric-value">{activeCustomers}</div>
            <div className="metric-trend">{totalCustomers > 0 ? Math.round((activeCustomers/totalCustomers)*100) : 0}% of total</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><CreditCard size={24} /></div>
          <div className="metric-info">
            <h4>Outstanding Amount</h4>
            <div className="metric-value">₹{totalOutstanding.toLocaleString()}</div>
            <div className="metric-trend negative">Total pending dues</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-purple"><FileText size={24} /></div>
          <div className="metric-info">
            <h4>Database Sync</h4>
            <div className="metric-value">Connected</div>
            <div className="metric-trend positive">MongoDB Live</div>
          </div>
        </div>
      </div>

      <div className="cm-section">
        <div className="section-header-row">
          <h3>Customer Directory</h3>
          <div className="search-filter">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search by name, phone, email, ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn-secondary" onClick={() => setSearchTerm('')}>Clear</button>
          </div>
        </div>
        
        <div className="table-container">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Info</th>
                <th>Location</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>Loading customers...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem', color:'#64748b'}}>No customers found. Try different search or add a new customer.</td></tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust._id} onClick={() => { setSelectedCustomer(cust); setProfileTab('overview'); setActiveView('profile'); }} className="clickable-row">
                    <td>
                      <div className="user-cell">
                        <div className="avatar">{cust.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>{cust.name}</strong>
                          <span className="sub-text">{cust.customerId} • {cust.type}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span><Phone size={14} /> {cust.phone}</span>
                        {cust.email && <span><Mail size={14} /> {cust.email}</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:'0.3rem', color:'#475569'}}>
                        <MapPin size={14} /> {cust.city || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <strong>₹{cust.currentBalance.toLocaleString()}</strong>
                      <div className="sub-text">Limit: ₹{cust.creditLimit.toLocaleString()}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${cust.status.toLowerCase()}`}>{cust.status}</span>
                    </td>
                    <td>
                      <div style={{display:'flex', gap:'0.5rem'}}>
                         <button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(cust); handleOpenEdit(); }}><Edit size={16} /></button>
                         <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(cust._id); }} style={{color:'#ef4444'}}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAddCustomer = () => (
    <div className="cm-form-view fade-in">
      <div className="cm-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView(isEditing ? 'profile' : 'dashboard')}>← Back</button>
          <h2 className="cm-title">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
          <p className="cm-subtitle">{isEditing ? 'Update customer details' : 'Fill in the details to create a new profile'}</p>
        </div>
      </div>

      <form className="form-layout" onSubmit={handleSaveCustomer}>
        <div className="form-sidebar">
          <button type="button" className={`form-tab ${formTab==='basic'?'active':''}`} onClick={()=>setFormTab('basic')}>Basic Info</button>
          <button type="button" className={`form-tab ${formTab==='business'?'active':''}`} onClick={()=>setFormTab('business')}>Business & GST</button>
          <button type="button" className={`form-tab ${formTab==='address'?'active':''}`} onClick={()=>setFormTab('address')}>Address Info</button>
          <button type="button" className={`form-tab ${formTab==='credit'?'active':''}`} onClick={()=>setFormTab('credit')}>Credit & Balance</button>
        </div>

        <div className="form-content">
          {formTab === 'basic' && (
            <div className="form-section fade-in">
              <h3>Basic Information</h3>
              <div className="form-grid">
                <div className="input-group">
                  <label>Customer Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="John Doe or Company Name" />
                </div>
                <div className="input-group">
                  <label>Customer Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    <option value="B2B">B2B (Business)</option>
                    <option value="B2C">B2C (Consumer)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Mobile Number *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="+91 0000000000" />
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="contact@example.com" />
                </div>
              </div>
            </div>
          )}

          {formTab === 'business' && (
            <div className="form-section fade-in">
              <h3>Business Information</h3>
              <div className="form-grid">
                <div className="input-group">
                  <label>GST Number</label>
                  <input type="text" name="gst" value={formData.gst} onChange={handleInputChange} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="input-group">
                  <label>PAN Number</label>
                  <input type="text" name="pan" value={formData.pan} onChange={handleInputChange} placeholder="ABCDE1234F" />
                </div>
                <div className="input-group">
                  <label>Website</label>
                  <input type="url" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://www.example.com" />
                </div>
              </div>
            </div>
          )}

          {formTab === 'address' && (
            <div className="form-section fade-in">
              <h3>Address Information</h3>
              <div className="form-grid">
                <div className="input-group">
                  <label>Address Line 1</label>
                  <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} placeholder="Street, Building name" />
                </div>
                <div className="input-group">
                  <label>Address Line 2</label>
                  <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} placeholder="Area, Landmark" />
                </div>
                <div className="input-group">
                  <label>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="Mumbai, Delhi, etc." />
                </div>
                <div className="input-group">
                  <label>State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleInputChange} placeholder="Maharashtra" />
                </div>
                <div className="input-group">
                  <label>Pincode</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="400001" />
                </div>
              </div>
            </div>
          )}

          {formTab === 'credit' && (
            <div className="form-section fade-in">
              <h3>Credit & Balance Information</h3>
              <div className="form-grid">
                <div className="input-group">
                  <label>Credit Limit (₹)</label>
                  <input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleInputChange} />
                </div>
                <div className="input-group">
                  <label>Credit Period (Days)</label>
                  <input type="number" name="creditPeriod" value={formData.creditPeriod} onChange={handleInputChange} />
                </div>
                <div className="input-group">
                  <label>Current / Opening Balance (₹)</label>
                  <input type="number" name="currentBalance" value={formData.currentBalance} onChange={handleInputChange} />
                </div>
                <div className="input-group" style={{gridColumn: '1 / -1'}}>
                  <label>Internal Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Any specific remarks for this customer..." rows="3"></textarea>
                </div>
              </div>
            </div>
          )}
          
          <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
            <button type="button" className="btn-secondary" onClick={() => setActiveView(isEditing ? 'profile' : 'dashboard')}><X size={16}/> Cancel</button>
            <button type="submit" className="btn-primary rainbow-bg"><Save size={16}/> {isEditing ? 'Save Changes' : 'Create Customer'}</button>
          </div>
        </div>
      </form>
    </div>
  );

  const renderProfile = () => {
    if(!selectedCustomer) return null;
    
    return (
      <div className="cm-profile-view fade-in">
        <div className="cm-header">
          <div>
            <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Directory</button>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={handleOpenEdit}><Edit size={16} /> Edit Profile</button>
            <button className="btn-danger" onClick={() => handleDeleteCustomer(selectedCustomer._id)}><Trash2 size={16} /> Delete</button>
          </div>
        </div>

        <div className="profile-overview-card">
          <div className="profile-hero">
            <div className="avatar large">{selectedCustomer.name.charAt(0).toUpperCase()}</div>
            <div className="profile-titles">
              <h2>{selectedCustomer.name}</h2>
              <p>{selectedCustomer.customerId} • {selectedCustomer.type}</p>
              <span className={`status-badge ${selectedCustomer.status.toLowerCase()}`}>{selectedCustomer.status}</span>
            </div>
          </div>
          
          <div className="profile-stats">
            <div className="stat-box">
              <span className="stat-label">Outstanding Balance</span>
              <span className="stat-value">₹{selectedCustomer.currentBalance.toLocaleString()}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Credit Limit</span>
              <span className="stat-value">₹{selectedCustomer.creditLimit.toLocaleString()}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Credit Available</span>
              <span className="stat-value text-green">₹{Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="profile-tabs-container">
          <div className="profile-tabs">
            <button className={`tab ${profileTab === 'overview' ? 'active' : ''}`} onClick={() => setProfileTab('overview')}>Overview Details</button>
            <button className={`tab ${profileTab === 'addresses' ? 'active' : ''}`} onClick={() => setProfileTab('addresses')}>Address Details</button>
            <button className={`tab ${profileTab === 'transactions' ? 'active' : ''}`} onClick={() => setProfileTab('transactions')}>Transactions</button>
            <button className={`tab ${profileTab === 'notes' ? 'active' : ''}`} onClick={() => setProfileTab('notes')}>Notes</button>
          </div>
          
          <div className="tab-content fade-in" style={{padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '0 0 12px 12px', border: '1px solid var(--border-color)', borderTop: 'none'}}>
            {profileTab === 'overview' && (
              <div className="details-grid">
                <div className="detail-card">
                  <h4>Contact Info</h4>
                  <div className="detail-row"><Phone size={16}/> <strong>Phone:</strong> {selectedCustomer.phone}</div>
                  <div className="detail-row"><Mail size={16}/> <strong>Email:</strong> {selectedCustomer.email || 'Not Provided'}</div>
                  <div className="detail-row"><Building size={16}/> <strong>City:</strong> {selectedCustomer.city || 'Not Provided'}</div>
                </div>
                <div className="detail-card">
                  <h4>Business Info</h4>
                  <div className="detail-row"><FileText size={16}/> <strong>GST:</strong> {selectedCustomer.gst || 'N/A'}</div>
                  <div className="detail-row"><FileText size={16}/> <strong>PAN:</strong> {selectedCustomer.pan || 'N/A'}</div>
                  <div className="detail-row"><Activity size={16}/> <strong>Added On:</strong> {new Date(selectedCustomer.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {profileTab === 'addresses' && (
              <div className="detail-card" style={{maxWidth: '600px'}}>
                <h4>Billing Address</h4>
                <div style={{marginTop: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6'}}>
                  {selectedCustomer.addressLine1 ? (
                    <>
                      <div>{selectedCustomer.addressLine1}</div>
                      {selectedCustomer.addressLine2 && <div>{selectedCustomer.addressLine2}</div>}
                      <div>{selectedCustomer.city}{selectedCustomer.state ? `, ${selectedCustomer.state}` : ''} {selectedCustomer.pincode}</div>
                    </>
                  ) : (
                    <div style={{fontStyle: 'italic'}}>No full address provided. Please update profile.</div>
                  )}
                </div>
              </div>
            )}

            {profileTab === 'transactions' && (
              <div style={{textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)'}}>
                <Activity size={48} style={{margin:'0 auto 1rem', opacity: 0.2}} />
                <h4>No Recent Transactions</h4>
                <p>Transactions will appear here once you generate invoices or record payments for this customer.</p>
              </div>
            )}

            {profileTab === 'notes' && (
              <div className="detail-card">
                <h4>Internal Notes</h4>
                <p style={{marginTop: '1rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)'}}>
                  {selectedCustomer.notes || 'No internal notes added for this customer.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="customer-management-wrapper">
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'add' && renderAddCustomer()}
      {activeView === 'profile' && renderProfile()}
    </div>
  );
}
