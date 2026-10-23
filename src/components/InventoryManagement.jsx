import { useState, useEffect } from 'react';
import { Box, TrendingUp, AlertTriangle, Package, ShoppingCart, Plus, X } from 'lucide-react';
import './InventoryManagement.css';
import { inventoryApi, productApi } from '../api';

export default function InventoryManagement({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form toggles
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);

  const [formData, setFormData] = useState({});

  async function fetchAllData() {
    try {
      setLoading(true);
      const [prod, mov, pur, sup, war, bat] = await Promise.all([
        productApi.getAll(), inventoryApi.getMovements(), inventoryApi.getPurchases(),
        inventoryApi.getSuppliers(), inventoryApi.getWarehouses(), inventoryApi.getBatches()
      ]);
      setProducts(prod); setMovements(mov); setPurchases(pur); setSuppliers(sup); setWarehouses(war); setBatches(bat);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchAllData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e, endpoint, stateUpdater, toggleForm) => {
    e.preventDefault();
    try {
      const newData = await inventoryApi.createItem(endpoint, formData);
      stateUpdater(prev => [newData, ...prev]);
      toggleForm(false);
      setFormData({});
      alert("Saved successfully!");
    } catch (error) {
      console.error(`Error adding to ${endpoint}:`, error);
      alert(`Network error: ${error.message}. Is the backend running?`);
    }
  };

  const totalProducts = products.length;
  const inventoryValue = products.reduce((acc, p) => p.type === 'Physical Product' ? acc + ((p.price || 0) * (p.stock || 0)) : acc, 0);
  const lowStockProducts = products.filter(p => p.type === 'Physical Product' && p.stock <= p.minStock);

  const renderDashboard = () => (
    <div className="im-view fade-in">
      <div className="im-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
          <h2 className="im-title">Inventory Dashboard</h2>
          <p className="im-subtitle">Overview of stock, valuation, and alerts</p>
        </div>
      </div>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-blue"><Box size={24} /></div>
          <div className="metric-info">
            <h4>Total Products</h4>
            <div className="metric-value">{totalProducts}</div>
            <div className="metric-trend positive">From Database</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-green"><TrendingUp size={24} /></div>
          <div className="metric-info">
            <h4>Inventory Value</h4>
            <div className="metric-value">₹{inventoryValue.toLocaleString()}</div>
            <div className="metric-trend positive">Total Value</div>
          </div>
        </div>
        <div className="metric-card alert-card">
          <div className="metric-icon"><AlertTriangle size={24} /></div>
          <div className="metric-info">
            <h4>Low Stock Alerts</h4>
            <div className="metric-value text-orange">{lowStockProducts.length} Items</div>
            <div className="metric-trend negative">Requires reorder</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-purple"><ShoppingCart size={24} /></div>
          <div className="metric-info">
            <h4>Pending Purchases</h4>
            <div className="metric-value">{purchases.length} Orders</div>
            <div className="metric-trend">Total tracked</div>
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="im-section" style={{ gridColumn: 'span 2' }}>
          <h3>Low Stock Alerts</h3>
          <p className="sub-text">Products below minimum reorder point</p>
          <table className="im-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Min Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{textAlign:'center', padding:'1rem'}}>Loading...</td></tr>
              ) : lowStockProducts.length === 0 ? (
                <tr><td colSpan="4" style={{textAlign:'center', padding:'1rem'}}>All stocks are healthy!</td></tr>
              ) : (
                lowStockProducts.map(product => (
                  <tr key={product._id}>
                    <td><strong>{product.name}</strong></td>
                    <td className={product.stock > 0 ? "text-orange" : ""} style={product.stock === 0 ? {color: '#ef4444'} : {}}>
                      <strong>{product.stock}</strong> {product.stock === 0 ? '(Out)' : ''}
                    </td>
                    <td>{product.minStock}</td>
                    <td><button className="btn-secondary" style={{padding:'0.2rem 0.5rem'}}>Reorder</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="im-section">
          <h3>Inventory Valuation</h3>
          <p className="sub-text">By Warehouse</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {warehouses.length > 0 ? warehouses.map(w => (
              <div key={w._id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span>{w.name}</span>
                <strong>{w.totalItems} Items</strong>
              </div>
            )) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span>Main Warehouse (Default)</span>
                <strong>₹{inventoryValue.toLocaleString()}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStockMovement = () => (
    <div className="im-view fade-in">
      <div className="im-header">
        <div>
          <h2 className="im-title">Stock Movement</h2>
          <p className="im-subtitle">Track Stock In, Stock Out, and complete inventory ledger</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary rainbow-bg" onClick={() => {setShowAddMovement(!showAddMovement); setFormData({});}}>
            {showAddMovement ? <><X size={16}/> Cancel</> : <><Plus size={16}/> Add Movement</>}
          </button>
        </div>
      </div>

      {showAddMovement && (
        <form className="im-section fade-in" style={{marginBottom: '1rem', background: 'var(--card-bg)'}} onSubmit={(e) => handleSubmit(e, 'movements', setMovements, setShowAddMovement)}>
          <h3>New Stock Movement</h3>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap'}}>
            <input type="date" required name="date" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <select name="type" required onChange={handleInputChange} className="form-input" style={{flex: 1}}>
              <option value="">Select Type</option>
              <option value="Purchase">Purchase (In)</option>
              <option value="Sale">Sale (Out)</option>
              <option value="Return">Return (In)</option>
              <option value="Damage">Damage (Out)</option>
            </select>
            <input type="text" required name="source" placeholder="Source/Ref (e.g. PO-001)" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="number" required name="qtyIn" placeholder="Qty In" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="number" required name="qtyOut" placeholder="Qty Out" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      )}

      <div className="stock-movement-flow">
        <div className="flow-step">
          <div className="flow-icon"><ShoppingCart size={24} /></div>
          <strong>Stock In</strong>
          <span className="sub-text">Purchases, Returns</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step active">
          <div className="flow-icon"><Box size={24} /></div>
          <strong>Available Inventory</strong>
          <span className="sub-text">Ready for Sale/Use</span>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="flow-icon"><Package size={24} /></div>
          <strong>Stock Out</strong>
          <span className="sub-text">Sales, Damage</span>
        </div>
      </div>

      <div className="im-section">
        <h3>Inventory Ledger</h3>
        <table className="im-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Source</th>
              <th>Qty In</th>
              <th>Qty Out</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem'}}>No movements found</td></tr> : 
             movements.map(m => (
              <tr key={m._id}>
                <td>{m.date || new Date(m.createdAt).toLocaleDateString()}</td>
                <td><span className={`status-badge ${m.type === 'Sale' || m.type === 'Damage' ? 'cancelled' : 'approved'}`}>{m.type}</span></td>
                <td>{m.source}</td>
                <td style={{color:'#10b981'}}>{m.qtyIn > 0 ? `+${m.qtyIn}` : '0'}</td>
                <td style={{color:'#ef4444'}}>{m.qtyOut > 0 ? `-${m.qtyOut}` : '0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPurchases = () => (
    <div className="im-view fade-in">
      <div className="im-header">
        <div>
          <h2 className="im-title">Purchase Management</h2>
          <p className="im-subtitle">Manage POs, goods receipt, and supplier invoices</p>
        </div>
        <button className="btn-primary rainbow-bg" onClick={() => {setShowAddPurchase(!showAddPurchase); setFormData({});}}>
          {showAddPurchase ? <><X size={16}/> Cancel</> : <><Plus size={16}/> Create PO</>}
        </button>
      </div>

      {showAddPurchase && (
        <form className="im-section fade-in" style={{marginBottom: '1rem'}} onSubmit={(e) => handleSubmit(e, 'purchases', setPurchases, setShowAddPurchase)}>
          <h3>Create Purchase Order</h3>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap'}}>
            <input type="text" required name="poNumber" placeholder="PO Number" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="date" required name="date" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="text" required name="supplier" placeholder="Supplier Name" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="number" required name="amount" placeholder="Total Amount (₹)" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <select name="status" onChange={handleInputChange} className="form-input" style={{flex: 1}}>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Received">Received</option>
            </select>
            <button type="submit" className="btn-primary">Save PO</button>
          </div>
        </form>
      )}

      <div className="im-section">
        <table className="im-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem'}}>No purchases found</td></tr> : 
             purchases.map(p => (
              <tr key={p._id}>
                <td><strong>{p.poNumber}</strong></td>
                <td>{p.date || new Date(p.createdAt).toLocaleDateString()}</td>
                <td>{p.supplier}</td>
                <td>₹{p.amount?.toLocaleString() || 0}</td>
                <td><span className={`status-badge ${p.status?.toLowerCase() || 'pending'}`}>{p.status || 'Pending'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSuppliers = () => (
    <div className="im-view fade-in">
       <div className="im-header">
        <div>
          <h2 className="im-title">Supplier Management</h2>
          <p className="im-subtitle">Maintain supplier profiles and procurement history</p>
        </div>
        <button className="btn-primary rainbow-bg" onClick={() => {setShowAddSupplier(!showAddSupplier); setFormData({});}}>
          {showAddSupplier ? <><X size={16}/> Cancel</> : <><Plus size={16}/> Add Supplier</>}
        </button>
      </div>
      
      {showAddSupplier && (
        <form className="im-section fade-in" style={{marginBottom: '1rem'}} onSubmit={(e) => handleSubmit(e, 'suppliers', setSuppliers, setShowAddSupplier)}>
          <h3>Add New Supplier</h3>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap'}}>
            <input type="text" required name="name" placeholder="Supplier Name" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="text" required name="code" placeholder="Code (e.g. SUP-001)" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="text" required name="contact" placeholder="Contact Person" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="email" required name="email" placeholder="Email Address" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="number" name="creditLimit" placeholder="Credit Limit" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <button type="submit" className="btn-primary">Save Supplier</button>
          </div>
        </form>
      )}

      <div className="grid-3">
        {suppliers.length === 0 ? <div style={{gridColumn:'span 3', textAlign:'center', padding:'2rem', color:'var(--text-secondary)'}}>No suppliers found</div> : 
         suppliers.map(s => (
          <div className="im-section" key={s._id}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
              <h3>{s.name}</h3>
              <span className="status-badge approved">{s.status || 'Active'}</span>
            </div>
            <p className="sub-text">Code: {s.code}</p>
            <div style={{marginTop:'1rem', fontSize:'0.9rem', display:'flex', flexDirection:'column', gap:'0.5rem'}}>
              <div><strong>Contact:</strong> {s.contact}</div>
              <div><strong>Email:</strong> {s.email}</div>
              <div><strong>Credit Limit:</strong> ₹{s.creditLimit?.toLocaleString() || 0}</div>
              {s.performance && <div><strong>Performance:</strong> {s.performance}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWarehouse = () => (
    <div className="im-view fade-in">
      <div className="im-header">
        <div>
          <h2 className="im-title">Warehouse Management</h2>
          <p className="im-subtitle">Manage inventory across multiple locations</p>
        </div>
        <button className="btn-primary rainbow-bg" onClick={() => {setShowAddWarehouse(!showAddWarehouse); setFormData({});}}>
          {showAddWarehouse ? <><X size={16}/> Cancel</> : <><Plus size={16}/> Add Warehouse</>}
        </button>
      </div>

      {showAddWarehouse && (
        <form className="im-section fade-in" style={{marginBottom: '1rem'}} onSubmit={(e) => handleSubmit(e, 'warehouses', setWarehouses, setShowAddWarehouse)}>
          <h3>Add New Warehouse</h3>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap'}}>
            <input type="text" required name="name" placeholder="Warehouse Name" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="text" required name="code" placeholder="Code (e.g. WH-01)" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="text" required name="manager" placeholder="Manager Name" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="number" name="totalItems" placeholder="Total Items Capacity" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <button type="submit" className="btn-primary">Save Warehouse</button>
          </div>
        </form>
      )}

      <div className="grid-3">
        {warehouses.length === 0 ? <div style={{gridColumn:'span 3', textAlign:'center', padding:'2rem', color:'var(--text-secondary)'}}>No warehouses found</div> : 
         warehouses.map(w => (
          <div className="im-section" key={w._id}>
            <h3>{w.name}</h3>
            <p className="sub-text">Code: {w.code}</p>
            <div style={{marginTop:'1rem'}}>
              <div style={{display:'flex', justifyContent:'space-between', padding:'0.5rem 0'}}>
                <span>Total Items:</span>
                <strong>{w.totalItems || 0}</strong>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', padding:'0.5rem 0'}}>
                <span>Manager:</span>
                <strong>{w.manager}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTracking = () => (
    <div className="im-view fade-in">
      <div className="im-header">
        <div>
          <h2 className="im-title">Batch Tracking</h2>
          <p className="im-subtitle">Trace products by batch expiry</p>
        </div>
        <button className="btn-primary rainbow-bg" onClick={() => {setShowAddBatch(!showAddBatch); setFormData({});}}>
          {showAddBatch ? <><X size={16}/> Cancel</> : <><Plus size={16}/> Add Batch</>}
        </button>
      </div>

      {showAddBatch && (
        <form className="im-section fade-in" style={{marginBottom: '1rem'}} onSubmit={(e) => handleSubmit(e, 'batches', setBatches, setShowAddBatch)}>
          <h3>Add New Batch</h3>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap'}}>
            <input type="text" required name="batchNo" placeholder="Batch No" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="text" required name="product" placeholder="Product Name" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <input type="number" required name="qty" placeholder="Quantity" onChange={handleInputChange} className="form-input" style={{flex: 1}} />
            <div style={{flex: 1, display:'flex', flexDirection:'column', gap:'0.2rem'}}>
              <label style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>Mfg Date</label>
              <input type="date" required name="mfgDate" onChange={handleInputChange} className="form-input" />
            </div>
            <div style={{flex: 1, display:'flex', flexDirection:'column', gap:'0.2rem'}}>
              <label style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>Expiry Date</label>
              <input type="date" required name="expiryDate" onChange={handleInputChange} className="form-input" />
            </div>
            <div style={{display:'flex', alignItems:'flex-end'}}>
               <button type="submit" className="btn-primary">Save Batch</button>
            </div>
          </div>
        </form>
      )}

      <div className="im-section">
        <table className="im-table">
          <thead>
            <tr>
              <th>Batch No.</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Mfg Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>No batches found</td></tr> : 
             batches.map(b => (
              <tr key={b._id}>
                <td><strong>{b.batchNo}</strong></td>
                <td>{b.product}</td>
                <td>{b.qty}</td>
                <td>{b.mfgDate}</td>
                <td>{b.expiryDate}</td>
                <td><span className={`status-badge ${b.status?.toLowerCase() === 'expired' ? 'cancelled' : 'approved'}`}>{b.status || 'Good'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="inventory-management-wrapper">
      {activeTab === 'dashboard' && (
        <div className="im-header" style={{paddingBottom:0, borderBottom:'none', marginBottom:'1rem'}}>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
        </div>
      )}
      
      <div className="tabs-simple">
        <button className={`tab-simple ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={`tab-simple ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>Stock Movement</button>
        <button className={`tab-simple ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>Purchases</button>
        <button className={`tab-simple ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>Suppliers</button>
        <button className={`tab-simple ${activeTab === 'warehouse' ? 'active' : ''}`} onClick={() => setActiveTab('warehouse')}>Warehouses</button>
        <button className={`tab-simple ${activeTab === 'tracking' ? 'active' : ''}`} onClick={() => setActiveTab('tracking')}>Batch & Serial</button>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'stock' && renderStockMovement()}
      {activeTab === 'purchases' && renderPurchases()}
      {activeTab === 'suppliers' && renderSuppliers()}
      {activeTab === 'warehouse' && renderWarehouse()}
      {activeTab === 'tracking' && renderTracking()}
    </div>
  );
}
