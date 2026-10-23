import { useState, useEffect } from 'react';
import { Package, Barcode, Layers, Box, DollarSign, Search, Edit, Trash2, ImageIcon, AlertCircle, TrendingUp, Plus, X, Save } from 'lucide-react';
import './ProductServiceManagement.css';
import { productApi } from '../api';

export default function ProductServiceManagement({ onBack }) {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, add_product, categories, inventory
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Form states
  const [formTab, setFormTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'Physical Product', category: 'Electronics', brand: '', hsnCode: '', description: '',
    price: 0, costPrice: 0, mrp: 0, taxRate: 'GST 18%',
    sku: '', barcode: '', stock: 0, minStock: 5, image: '📦'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const data = await productApi.getAll();
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
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
    setSelectedProduct(null);
    setFormData({
      name: '', type: 'Physical Product', category: 'Electronics', brand: '', hsnCode: '', description: '',
      price: 0, costPrice: 0, mrp: 0, taxRate: 'GST 18%',
      sku: '', barcode: '', stock: 0, minStock: 5, image: '📦'
    });
    setFormTab('basic');
    setActiveView('add_product');
  };

  const handleOpenEdit = (product) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name, type: product.type, category: product.category, brand: product.brand || '', hsnCode: product.hsnCode || '', description: product.description || '',
      price: product.price, costPrice: product.costPrice || 0, mrp: product.mrp || 0, taxRate: product.taxRate || 'GST 18%',
      sku: product.sku || '', barcode: product.barcode || '', stock: product.stock, minStock: product.minStock, image: product.image || '📦'
    });
    setFormTab('basic');
    setActiveView('add_product');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      price: Number(formData.price),
      costPrice: Number(formData.costPrice),
      mrp: Number(formData.mrp),
      stock: Number(formData.stock),
      minStock: Number(formData.minStock)
    };

    try {
      if (isEditing) {
        await productApi.update(selectedProduct._id, payload);
      } else {
        await productApi.create(payload);
      }
      
      await fetchProducts();
      setActiveView('dashboard');
    } catch (error) {
      console.error("Error saving product:", error);
      alert(`Error saving product: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    if(!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productApi.delete(id);
      await fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert(`Error deleting product: ${error.message}`);
    }
  };

  // Filtering
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.productId && p.productId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'All' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  // Metrics
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.type === 'Physical Product' && p.stock <= p.minStock).length;
  const totalInventoryValue = products.reduce((acc, p) => p.type === 'Physical Product' ? acc + (p.price * p.stock) : acc, 0);
  
  const generateSKU = () => {
    const prefix = formData.category.substring(0, 3).toUpperCase();
    const namePart = formData.name.substring(0, 3).toUpperCase() || 'XXX';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormData(prev => ({...prev, sku: `${prefix}-${namePart}-${rand}`}));
  };

  const renderDashboard = () => (
    <div className="psm-dashboard fade-in">
      <div className="psm-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
          <h2 className="psm-title">Products & Services</h2>
          <p className="psm-subtitle">Manage your catalog, inventory, pricing, and services</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setActiveView('categories')}>
            <Layers size={18} /> Categories
          </button>
          <button className="btn-primary rainbow-bg" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Product/Service
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon bg-purple"><Package size={24} /></div>
          <div className="metric-info">
            <h4>Total Catalog Items</h4>
            <div className="metric-value">{totalProducts}</div>
            <div className="metric-trend positive">Real-time sync</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-orange"><AlertCircle size={24} /></div>
          <div className="metric-info">
            <h4>Low Stock Items</h4>
            <div className="metric-value">{lowStockCount}</div>
            <div className="metric-trend negative">Requires attention</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-green"><DollarSign size={24} /></div>
          <div className="metric-info">
            <h4>Total Inventory Value</h4>
            <div className="metric-value">₹{totalInventoryValue.toLocaleString()}</div>
            <div className="metric-trend">Expected Sales Value</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon bg-blue"><TrendingUp size={24} /></div>
          <div className="metric-info">
            <h4>Database Status</h4>
            <div className="metric-value text-medium">Connected</div>
            <div className="metric-trend positive">MongoDB Live</div>
          </div>
        </div>
      </div>

      <div className="psm-section">
        <div className="section-header-row">
          <div className="tabs-simple">
            <button className={`tab-simple ${filterType === 'All' ? 'active' : ''}`} onClick={() => setFilterType('All')}>All Items</button>
            <button className={`tab-simple ${filterType === 'Physical Product' ? 'active' : ''}`} onClick={() => setFilterType('Physical Product')}>Physical</button>
            <button className={`tab-simple ${filterType === 'Service' ? 'active' : ''}`} onClick={() => setFilterType('Service')}>Services</button>
          </div>
          <div className="search-filter">
            <div className="search-box">
              <Search size={18} />
              <input type="text" placeholder="Search by name, SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button className="btn-secondary" onClick={() => {setSearchTerm(''); setFilterType('All');}}>Clear</button>
          </div>
        </div>
        
        <div className="table-container">
          <table className="psm-table">
            <thead>
              <tr>
                <th>Product Info</th>
                <th>SKU / Type</th>
                <th>Category</th>
                <th>Pricing</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{textAlign:'center', padding:'2rem'}}>Loading catalog...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="7" style={{textAlign:'center', padding:'2rem', color:'#64748b'}}>No products found. Add your first item.</td></tr>
              ) : (
                filteredProducts.map(prod => (
                  <tr key={prod._id} className="clickable-row">
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb">{prod.image}</div>
                        <div>
                          <strong>{prod.name}</strong>
                          <span className="sub-text">{prod.productId}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="code-cell">
                        <span className="sku-badge">{prod.sku || 'No SKU'}</span>
                        <span className="type-badge">{prod.type}</span>
                      </div>
                    </td>
                    <td>{prod.category}</td>
                    <td>
                      <strong>₹{prod.price.toLocaleString()}</strong>
                    </td>
                    <td>
                      {prod.type === 'Service' || prod.type === 'Subscription' ? (
                        <span className="sub-text">N/A (Non-inventory)</span>
                      ) : (
                        <div className="stock-cell">
                          <span className={`stock-count ${prod.stock <= prod.minStock ? 'text-orange' : 'text-green'}`}>
                            {prod.stock} in stock
                          </span>
                          {prod.stock <= prod.minStock && <span className="low-stock-warn">Low</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${prod.status.toLowerCase().replace(/ /g, '-')}`}>{prod.status}</span>
                    </td>
                    <td>
                      <div style={{display:'flex', gap:'0.5rem'}}>
                         <button className="action-btn" onClick={() => handleOpenEdit(prod)}><Edit size={16} /></button>
                         <button className="action-btn" onClick={() => handleDeleteProduct(prod._id)} style={{color:'#ef4444'}}><Trash2 size={16} /></button>
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

  const renderAddProduct = () => (
    <div className="psm-form-view fade-in">
      <div className="psm-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Catalog</button>
          <h2 className="psm-title">{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
          <p className="psm-subtitle">{isEditing ? 'Update product details' : 'Create a physical product, digital good, service, or bundle'}</p>
        </div>
      </div>

      <form className="form-layout" onSubmit={handleSaveProduct}>
        <div className="form-sidebar">
          <button type="button" className={`form-tab ${formTab === 'basic' ? 'active':''}`} onClick={()=>setFormTab('basic')}><Package size={16}/> Basic Details</button>
          <button type="button" className={`form-tab ${formTab === 'pricing' ? 'active':''}`} onClick={()=>setFormTab('pricing')}><DollarSign size={16}/> Pricing & Tax</button>
          <button type="button" className={`form-tab ${formTab === 'inventory' ? 'active':''}`} onClick={()=>setFormTab('inventory')}><Box size={16}/> Inventory & Barcodes</button>
          <button type="button" className={`form-tab ${formTab === 'images' ? 'active':''}`} onClick={()=>setFormTab('images')}><ImageIcon size={16}/> Image Icon</button>
        </div>

        <div className="form-content">
          {formTab === 'basic' && (
            <div className="form-section fade-in">
              <h3>Basic Information</h3>
              <div className="form-grid">
                <div className="input-group full-span">
                  <label>Product/Service Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. Wireless Noise Cancelling Headphones" />
                </div>
                <div className="input-group">
                  <label>Product Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    <option value="Physical Product">Physical Product</option>
                    <option value="Digital Product">Digital Product</option>
                    <option value="Service">Service</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Bundle/Combo">Bundle/Combo</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    <option value="Uncategorized">Select Category...</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Software">Software</option>
                    <option value="Services">Services</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Hosting">Hosting</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Brand</label>
                  <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} placeholder="e.g. Sony" />
                </div>
                <div className="input-group">
                  <label>Product Code / HSN</label>
                  <input type="text" name="hsnCode" value={formData.hsnCode} onChange={handleInputChange} placeholder="e.g. 85183000" />
                </div>
                <div className="input-group full-span">
                  <label>Description</label>
                  <textarea name="description" rows="4" value={formData.description} onChange={handleInputChange} placeholder="Detailed product description..."></textarea>
                </div>
              </div>
            </div>
          )}

          {formTab === 'pricing' && (
            <div className="form-section fade-in">
              <h3>Pricing & Tax</h3>
              <div className="form-grid">
                <div className="input-group">
                  <label>Selling Price (₹) *</label>
                  <input type="number" required name="price" value={formData.price} onChange={handleInputChange} placeholder="0.00" />
                </div>
                <div className="input-group">
                  <label>Cost Price (₹)</label>
                  <input type="number" name="costPrice" value={formData.costPrice} onChange={handleInputChange} placeholder="0.00" />
                </div>
                <div className="input-group">
                  <label>MRP (₹)</label>
                  <input type="number" name="mrp" value={formData.mrp} onChange={handleInputChange} placeholder="0.00" />
                </div>
                <div className="input-group">
                  <label>Tax Rate (%)</label>
                  <select name="taxRate" value={formData.taxRate} onChange={handleInputChange}>
                    <option value="GST 18%">GST 18%</option>
                    <option value="GST 12%">GST 12%</option>
                    <option value="GST 5%">GST 5%</option>
                    <option value="Tax Exempt">Tax Exempt</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {formTab === 'inventory' && (
            <div className="form-section fade-in">
              <h3>Inventory & Barcodes</h3>
              {formData.type === 'Service' || formData.type === 'Subscription' ? (
                <div style={{padding: '2rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px', textAlign: 'center'}}>
                  <AlertCircle size={32} style={{margin: '0 auto 1rem'}}/>
                  <h4>Inventory Disabled</h4>
                  <p>Stock tracking is not applicable for Services or Subscriptions.</p>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="input-group">
                    <label>SKU</label>
                    <div className="input-with-action">
                      <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} placeholder="Auto-generated if empty" />
                      <button type="button" className="inline-btn" onClick={generateSKU}>Generate</button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Barcode (EAN/UPC)</label>
                    <div className="input-with-action">
                      <input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} placeholder="Scan or enter barcode" />
                      <button type="button" className="inline-btn"><Barcode size={16}/></button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Current Stock</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} placeholder="0" />
                  </div>
                  <div className="input-group">
                    <label>Low Stock Alert Limit</label>
                    <input type="number" name="minStock" value={formData.minStock} onChange={handleInputChange} placeholder="5" />
                  </div>
                </div>
              )}
            </div>
          )}

          {formTab === 'images' && (
            <div className="form-section fade-in">
              <h3>Product Icon (Emoji)</h3>
              <p className="sub-text" style={{marginBottom:'1rem'}}>For simplicity, select an emoji to represent this product.</p>
              <div className="form-grid">
                <div className="input-group">
                  <label>Select Emoji Icon</label>
                  <select name="image" value={formData.image} onChange={handleInputChange} style={{fontSize: '2rem', height: '60px'}}>
                    <option value="📦">📦 Box</option>
                    <option value="📱">📱 Mobile</option>
                    <option value="💻">💻 Laptop</option>
                    <option value="🖥️">🖥️ Desktop</option>
                    <option value="💺">💺 Furniture</option>
                    <option value="☁️">☁️ Cloud</option>
                    <option value="🔧">🔧 Service/Repair</option>
                    <option value="👕">👕 Apparel</option>
                    <option value="🍔">🍔 Food</option>
                    <option value="📚">📚 Book</option>
                    <option value="💊">💊 Medicine</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
            <button type="button" className="btn-secondary" onClick={() => setActiveView('dashboard')}><X size={16}/> Cancel</button>
            <button type="submit" className="btn-primary rainbow-bg"><Save size={16}/> {isEditing ? 'Save Changes' : 'Create Item'}</button>
          </div>
        </div>
      </form>
    </div>
  );

  const renderCategories = () => (
    <div className="psm-categories-view fade-in">
       <div className="psm-header">
        <div>
          <button className="back-btn" onClick={() => setActiveView('dashboard')}>← Back to Catalog</button>
          <h2 className="psm-title">Categories</h2>
          <p className="psm-subtitle">Manage product hierarchy and grouping</p>
        </div>
        <button className="btn-primary rainbow-bg"><Plus size={18} /> Add Category</button>
      </div>
      
      <div className="categories-layout">
        <div className="category-tree">
          <h3>Category Hierarchy</h3>
          <ul className="tree-list">
            <li className="tree-item expanded">
              <div className="tree-node">
                <span className="toggle-icon">▼</span>
                <span className="folder-icon">📂</span> Electronics
              </div>
              <ul className="tree-sublist">
                <li className="tree-item">
                  <div className="tree-node selected">
                    <span className="folder-icon">📁</span> Mobile Phones
                  </div>
                </li>
                <li className="tree-item">
                  <div className="tree-node">
                    <span className="folder-icon">📁</span> Laptops
                  </div>
                </li>
              </ul>
            </li>
            <li className="tree-item">
              <div className="tree-node">
                <span className="toggle-icon">▶</span>
                <span className="folder-icon">📁</span> Clothing & Apparel
              </div>
            </li>
            <li className="tree-item">
              <div className="tree-node">
                <span className="toggle-icon">▶</span>
                <span className="folder-icon">📁</span> Software Services
              </div>
            </li>
          </ul>
        </div>
        
        <div className="category-details form-section">
          <div style={{textAlign:'center', padding:'3rem', color:'var(--text-secondary)'}}>
            <Layers size={48} style={{margin:'0 auto 1rem', opacity: 0.2}} />
            <h4>Category Management Active</h4>
            <p>Select a category from the left tree to edit its properties, or create a new one.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="product-management-wrapper">
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'add_product' && renderAddProduct()}
      {activeView === 'categories' && renderCategories()}
    </div>
  );
}
