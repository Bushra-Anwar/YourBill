import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Search, Printer, Plus, Trash2, X, RefreshCw, Package } from 'lucide-react';
import './POSBilling.css';
import { productApi, invoiceApi } from '../api';
import { AuthContext } from '../context/AuthContextValue';



export default function POSBilling({ onBack, onInvoiceGenerated }) {
  const { user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const currency = user?.currency || '₹';

  // Customer & Bill Metadata
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [customerType, setCustomerType] = useState('DINE_IN');

  const [paymentMode, setPaymentMode] = useState('Cash');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [lastInvoice, setLastInvoice] = useState(null);
  const [billDiscount, setBillDiscount] = useState(0);
  const [fixedCharges, setFixedCharges] = useState(0);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ name: '', price: '', qty: 1, taxRate: 5, unit: 'Piece' });
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    price: '',
    mrp: '',
    taxRate: '18',
    category: 'General',
    unit: 'Piece',
    stock: 50
  });

  // Get dynamic company profile
  const getCompany = () => {
    let stored = null;
    try {
      const raw = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('companyProfile');
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }

    const combined = { ...stored, ...user };

    return {
      companyName: combined?.companyName || combined?.shopName || combined?.businessName || combined?.name || 'Apna Billbook',
      ownerName: combined?.name || combined?.ownerName || 'OWNER',
      phone: combined?.phone || '7535941006',
      email: combined?.email || 'princedubey80066@gmail.com',
      address: combined?.address || [combined?.city, combined?.state].filter(Boolean).join(', ') || 'Gaur City 2, Ghaziabaad , UP',
      tagline: combined?.tagline || 'Best From Best',
      gstin: combined?.gstin || 'GSTIN859612356',
      bankDetails: {
        upiId: combined?.bankDetails?.upiId || (combined?.phone ? `${combined.phone}@upi` : '7535941006@upi')
      }
    };
  };

  const company = getCompany();

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await productApi.getAll();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Could not load products:", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const formatPrice = amount => `${currency}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const addItemToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      const parsedTax = parseFloat(String(product.taxRate || '5').replace(/[^0-9.]/g, '')) || 5;
      return [...prev, {
        ...product,
        qty: 1,
        mrp: product.mrp || Math.round((product.price || 0) * 1.1) || product.price,
        taxRate: `${parsedTax}%`,
        unit: product.unit || 'Piece'
      }];
    });
  };

  const handleSaveRealProduct = async (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || Number(newProductForm.price) <= 0) {
      alert('Please enter a valid product name and price.');
      return;
    }
    const salePrice = Number(newProductForm.price);
    const mrpPrice = Number(newProductForm.mrp) || Math.round(salePrice * 1.1) || salePrice;
    const taxNum = parseFloat(String(newProductForm.taxRate || '18').replace(/[^0-9.]/g, '')) || 0;

    const payload = {
      name: newProductForm.name.trim(),
      price: salePrice,
      mrp: mrpPrice,
      taxRate: `GST ${taxNum}%`,
      stock: Number(newProductForm.stock) || 50,
      unit: newProductForm.unit || 'Piece',
      category: newProductForm.category || 'General',
      type: 'Physical Product',
      image: '📦'
    };

    try {
      const created = await productApi.create(payload);
      await loadProducts();
      addItemToCart(created);
      setShowNewProductModal(false);
      setNewProductForm({
        name: '',
        price: '',
        mrp: '',
        taxRate: '18',
        category: 'General',
        unit: 'Piece',
        stock: 50
      });
      alert(`✅ Product "${created.name}" saved to your store and added to cart!`);
    } catch (err) {
      console.error('Failed to create product:', err);
      alert('Could not save product: ' + err.message);
    }
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItemForm.name.trim() || Number(customItemForm.price) <= 0) {
      alert('Please enter a valid item name and price.');
      return;
    }
    const newItem = {
      _id: `custom_${Date.now()}`,
      name: customItemForm.name.trim(),
      price: parseFloat(customItemForm.price) || 0,
      mrp: Math.round(parseFloat(customItemForm.price) * 1.1) || parseFloat(customItemForm.price),
      taxRate: `${customItemForm.taxRate}%`,
      qty: parseInt(customItemForm.qty, 10) || 1,
      unit: customItemForm.unit || 'Piece',
      image: '✨'
    };
    setCartItems(prev => [...prev, newItem]);
    setShowCustomItemModal(false);
    setCustomItemForm({ name: '', price: '', qty: 1, taxRate: 5, unit: 'Piece' });
  };

  const updateQuantity = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeItem = (id) => {
    setCartItems(prev => prev.filter(item => item._id !== id));
  };

  const handleReset = () => {
    setCartItems([]);
    setLastInvoice(null);
  };

  // Calculations matching Thermal Receipt breakdown
  const subtotal = cartItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0);
  const totalTax = cartItems.reduce((sum, item) => {
    const p = parseFloat(String(item.taxRate || '0').replace(/[^0-9.]/g, '')) || 0;
    return sum + (((Number(item.price) || 0) * (Number(item.qty) || 1) * p) / 100);
  }, 0);

  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const effectiveSubtotal = Math.max(0, subtotal - Number(billDiscount || 0));
  const rawTotal = effectiveSubtotal + totalTax + Number(fixedCharges || 0);
  const finalTotal = Math.round(rawTotal);
  const roundOff = (finalTotal - rawTotal).toFixed(2);
  const changeDue = Math.max(0, (parseFloat(tenderedAmount) || finalTotal) - finalTotal);

  // Date Formatting for Thermal Receipt (DD/MM/YYYY and HH:mm)
  const formatThermalDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date: `${dd}/${mm}/${yyyy}`, time };
  };

  const thDate = formatThermalDate(lastInvoice?.date);

  // Indian Number To Words
  const numberToWordsIndian = (num) => {
    const nNum = Math.round(Number(num) || 0);
    if (nNum <= 0) return 'Zero Rupees Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const n = ('000000000' + nNum).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return `${nNum} Rupees Only`;
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() ? str.trim() + ' Rupees Only' : 'Zero Rupees Only';
  };

  // UPI QR Url
  const getUPIQrUrl = (upiId, compName, amount, billNo) => {
    const upiIntent = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(compName)}&am=${Number(amount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + billNo)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiIntent)}`;
  };

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return alert('Cart is empty! Add products first.');

    try {
      const generatedBillNo = `KATRA${Math.floor(10 + Math.random() * 90)}`;
      const payload = {
        invoiceNumber: generatedBillNo,
        customerName: customerName || 'Walk-in Retail Customer',
        customerPhone: customerPhone || '',
        customerGstin: customerGstin || '',
        customerType: customerType,
        tableNo: tableNo,
        type: 'POS Thermal Bill',
        date: new Date().toISOString(),
        items: cartItems.map(item => {
          const taxPercent = parseFloat(String(item.taxRate || '0').replace(/[^0-9.]/g, '')) || 0;
          const baseAmount = (Number(item.price) || 0) * (item.qty || 1);
          return {
            productId: item._id,
            name: item.name,
            qty: item.qty || 1,
            unit: item.unit || 'Piece',
            mrp: item.mrp || item.price,
            rate: item.price,
            taxRate: taxPercent,
            amount: baseAmount + (baseAmount * taxPercent / 100)
          };
        }),
        subtotal,
        discount: Number(billDiscount || 0),
        fixedCharges: Number(fixedCharges || 0),
        totalTax,
        cgstTotal: cgst,
        sgstTotal: sgst,
        grandTotal: finalTotal,
        totalAmount: finalTotal,
        paidAmount: finalTotal,
        balanceAmount: 0,
        paymentStatus: 'Paid',
        paymentMethod: paymentMode,
        status: 'Paid',
        orderStatus: 'COMPLETED',
        notes: `Tendered: ${currency}${tenderedAmount || finalTotal}, Change: ${currency}${changeDue.toFixed(2)}`
      };

      const saved = await invoiceApi.create(payload);
      setLastInvoice(saved);
      setShowCheckoutModal(false);
      if (onInvoiceGenerated) onInvoiceGenerated(saved);
      alert(`✅ Sale completed! Receipt #${saved.invoiceNumber} recorded in database. Click "Print Receipt" anytime.`);
    } catch (error) {
      console.error('POS Sale error:', error);
      alert(`Error completing sale: ${error.message}`);
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const currentBillNo = lastInvoice?.invoiceNumber || 'KATRA44';

  return (
    <div className="pos-wrapper fade-in">
      {/* Top action bar - Hidden during print */}
      <div className="pos-top-bar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onBack && (
            <button className="pos-back-btn" onClick={onBack}>← Back to Dashboard</button>
          )}
          <h2 className="pos-main-title">Fast POS Terminal</h2>
        </div>
        <div className="pos-top-actions">
          <button
            className="btn-primary"
            style={{ padding: '0.6rem 1.1rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => setShowNewProductModal(true)}
          >
            <Plus size={16} /> + Add Real Product
          </button>
          <button
            className="btn-secondary"
            style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowCustomItemModal(true)}
          >
            <Plus size={16} /> Quick Custom Item
          </button>
          <button className="pos-btn-share" onClick={() => window.print()}>
            <Printer size={16} /> Print Thermal Bill
          </button>
        </div>
      </div>

      <div className="pos-grid">
        {/* Left Column: Product Picker (Hidden during print) */}
        <div className="pos-col pos-left-col no-print">
          <div className="pos-left-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p className="pos-label" style={{ margin: 0 }}>Live Catalog</p>
                <button
                  onClick={loadProducts}
                  title="Refresh products"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                >
                  <RefreshCw size={13} className={loadingProducts ? 'spin' : ''} />
                </button>
              </div>
              <h3>{products.length} Products</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="pos-label">In Cart</p>
              <h3>{cartItems.reduce((sum, item) => sum + item.qty, 0)} Items</h3>
            </div>
          </div>

          {/* Search Bar */}
          <div className="pos-left-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search items by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 0 10px 0', scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: selectedCategory === cat ? '1px solid #2563eb' : '1px solid var(--border-color, #cbd5e1)',
                  background: selectedCategory === cat ? '#2563eb' : 'var(--bg-secondary, #f8fafc)',
                  color: selectedCategory === cat ? '#fff' : 'inherit',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="pos-products-grid" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {filteredProducts.map(product => (
              <button
                key={product._id}
                className="pos-grid-btn"
                onClick={() => addItemToCart(product)}
                style={{ textAlign: 'left', padding: '0.8rem', cursor: 'pointer', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.4rem' }}>{product.image || '📦'}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Stock: {product.stock || 50}</span>
                </div>
                <strong style={{ display: 'block', fontSize: '0.85rem', margin: '6px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="btn-val" style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {formatPrice(product.price || 0)}
                  </span>
                  <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '3px' }}>
                    + ADD
                  </span>
                </div>
              </button>
            ))}
            {products.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <Package size={36} style={{ color: '#94a3b8', margin: '0 auto 8px', display: 'block' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Products Added Yet</h4>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                  Add your real store products so they appear here and in your inventory.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => setShowNewProductModal(true)}
                  style={{ padding: '8px 18px', fontWeight: 'bold', background: '#16a34a', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                >
                  + Add Real Product
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 1rem' }}>
                <p style={{ color: '#64748b', marginBottom: '1rem' }}>No products matching "{searchTerm}".</p>
                <button
                  className="btn-primary"
                  onClick={() => setShowNewProductModal(true)}
                  style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + Add New Product
                </button>
              </div>
            ) : null}
          </div>

          <div className="pos-bottom-actions">
            <div className="pos-action-row-1">
              <button className="pos-btn-large bg-gray" onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}>Reset Filters</button>
              <button className="pos-btn-large bg-green text-white" onClick={handleReset}>Clear Cart</button>
            </div>
          </div>
        </div>

        {/* Middle Column: Cart & Customer details (Hidden during print) */}
        <div className="pos-col pos-mid-col no-print">
          <div className="pos-mid-header">
            <div>
              <p className="pos-label">Current Basket</p>
              <h3>{cartItems.length} Items Selected</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="pos-label">Total Payable</p>
              <h3 style={{ color: '#16a34a' }}>{formatPrice(finalTotal)}</h3>
            </div>
          </div>

          {/* Quick Customer Details Input */}
          <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Phone / Contact</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Table No</label>
                <input
                  type="text"
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="pos-cart-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {cartItems.map(item => (
              <div key={item._id} className="pos-cart-item" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '1.4rem' }}>{item.image || '📦'}</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.88rem', display: 'block' }}>{item.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatPrice(item.price)} · GST: {item.taxRate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button onClick={() => updateQuantity(item._id, -1)} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>-</button>
                  <span style={{ fontWeight: 'bold', minWidth: '22px', textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQuantity(item._id, 1)} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>+</button>
                </div>
                <div style={{ fontWeight: 'bold', minWidth: '65px', textAlign: 'right', fontSize: '0.9rem' }}>
                  {formatPrice(item.price * item.qty)}
                </div>
                <button onClick={() => removeItem(item._id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '4px' }} title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {cartItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
                🛒 Cart is empty. Click any product on the left to add.
              </div>
            )}
          </div>

          {/* Cart Breakdown Footer */}
          <div className="pos-mid-footer">
            <div className="pos-summary-row">
              <span>Item Total:</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div className="pos-summary-row">
              <span>Bill Discount:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>- ₹</span>
                <input
                  type="number"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
                  style={{ width: '60px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                />
              </div>
            </div>
            <div className="pos-summary-row text-green">
              <span>Taxes (GST):</span>
              <strong>{formatPrice(totalTax)}</strong>
            </div>
            <div className="pos-summary-row grand-total-row">
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Grand Total:</span>
              <strong style={{ fontSize: '1.25rem', color: '#16a34a' }}>{formatPrice(finalTotal)}</strong>
            </div>
            <button
              className="pos-btn-complete"
              disabled={cartItems.length === 0}
              onClick={() => { setTenderedAmount(finalTotal); setShowCheckoutModal(true); }}
              style={{ opacity: cartItems.length === 0 ? 0.5 : 1, cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              ⚡ Pay & Complete Sale ({formatPrice(finalTotal)})
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN: EXACT IMAGE 2 THERMAL RECEIPT
            Visible on screen AND printed with @media print
            ══════════════════════════════════════════════════════════════ */}
        <div className="pos-col pos-right-col">
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>THERMAL 80MM PREVIEW</span>
            <button
              className="btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => window.print()}
            >
              <Printer size={13} /> Print Now
            </button>
          </div>

          <div className="thermal-receipt-container">
            {/* Header */}
            <div className="th-header">
              <div className="th-logo-square">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div className="th-company-title">{company.companyName}</div>
              <div className="th-address-line">{company.address}</div>
              <div className="th-tagline">{company.tagline}</div>
              <div className="th-phone-line">{company.phone}</div>
              <div className="th-email-line">Email - {company.email}</div>
            </div>

            <hr className="th-dashed-separator" />

            {/* Bill Info */}
            <table className="th-meta-table">
              <tbody>
                <tr>
                  <td className="th-meta-label">Bill No #:</td>
                  <td className="th-meta-val">{currentBillNo}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">ITEM:</td>
                  <td className="th-meta-val">
                    {cartItems.length > 0 ? cartItems.map((_, i) => `ITEM110${i}`).join(', ') : 'ITEM1100, ITEM1101'}
                  </td>
                </tr>
                <tr>
                  <td className="th-meta-label">Date:</td>
                  <td className="th-meta-val">{thDate.date}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Time:</td>
                  <td className="th-meta-val">{thDate.time}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Customer Type:</td>
                  <td className="th-meta-val">{customerType}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Table No:</td>
                  <td className="th-meta-val">{tableNo}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Order Status:</td>
                  <td className="th-meta-val">{lastInvoice ? 'COMPLETED' : 'PENDING'}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Payment Method:</td>
                  <td className="th-meta-val">{paymentMode.toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Payment Status:</td>
                  <td className="th-meta-val">{lastInvoice ? 'PAID' : 'PENDING'}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Staff Name:</td>
                  <td className="th-meta-val">OWNER</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Created By:</td>
                  <td className="th-meta-val">{company.ownerName.toUpperCase()}</td>
                </tr>
              </tbody>
            </table>

            {/* Billing To */}
            <div className="th-billing-heading">Billing To</div>
            <table className="th-meta-table">
              <tbody>
                <tr>
                  <td className="th-meta-label">Name:</td>
                  <td className="th-meta-val">{customerName}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Contact No.:</td>
                  <td className="th-meta-val">{customerPhone}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">GSTIN.:</td>
                  <td className="th-meta-val">{customerGstin}</td>
                </tr>
              </tbody>
            </table>

            <hr className="th-dashed-separator" />

            {/* Items */}
            <table className="th-items-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Items</th>
                  <th className="th-center" style={{ width: '18%' }}>Qty</th>
                  <th className="th-right" style={{ width: '17%' }}>Price</th>
                  <th className="th-right" style={{ width: '20%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px 8px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                      (Cart is empty. Select products on the left to generate receipt)
                    </td>
                  </tr>
                ) : (
                  cartItems.map((it, idx) => {
                  const qty = Number(it.qty) || 1;
                  const rate = Number(it.price) || 0;
                  const taxRate = parseFloat(String(it.taxRate || '0').replace(/[^0-9.]/g, '')) || 0;
                  const mrp = it.mrp || Math.round(rate * 1.1) || rate;
                  const itemAmt = (qty * rate) + ((qty * rate * taxRate) / 100);

                  return (
                    <React.Fragment key={idx}>
                      <tr className="th-item-main-row">
                        <td>
                          <div className="th-item-name">{it.name}</div>
                          <div className="th-item-sub-detail">MRP ₹{mrp}</div>
                          <div className="th-item-sub-detail">GST: {taxRate}%</div>
                          {it.extraNote && <div className="th-item-sub-detail">{it.extraNote}</div>}
                        </td>
                        <td className="th-center" style={{ verticalAlign: 'middle' }}>
                          {qty} {it.unit || 'Piece'}
                        </td>
                        <td className="th-right" style={{ verticalAlign: 'middle' }}>
                          {rate}
                        </td>
                        <td className="th-right" style={{ verticalAlign: 'middle', fontWeight: 'bold' }}>
                          {itemAmt.toFixed(2)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                }))}
              </tbody>
            </table>

            <hr className="th-dashed-separator" />

            {/* Totals */}
            <table className="th-totals-table">
              <tbody>
                <tr>
                  <td>Item Total:</td>
                  <td className="th-val">₹{Math.round(subtotal)}</td>
                </tr>
                {billDiscount > 0 && (
                  <tr>
                    <td>Bill Discount:</td>
                    <td className="th-val">- ₹{Number(billDiscount).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td>Subtotal:</td>
                  <td className="th-val">₹{effectiveSubtotal.toFixed(2)}</td>
                </tr>
                {fixedCharges > 0 && (
                  <tr>
                    <td>Fixed:</td>
                    <td className="th-val">₹{Number(fixedCharges).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td>CGST:</td>
                  <td className="th-val">₹{cgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>SGST:</td>
                  <td className="th-val">₹{sgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Round Off:</td>
                  <td className="th-val">₹{roundOff}</td>
                </tr>
                <tr className="th-grand-total-row">
                  <td>Grand Total:</td>
                  <td className="th-val">₹{finalTotal}</td>
                </tr>
                <tr>
                  <td>Paid Amount:</td>
                  <td className="th-val">₹{(parseFloat(tenderedAmount) || finalTotal).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <hr className="th-dashed-separator" />

            <table className="th-meta-table">
              <tbody>
                <tr>
                  <td className="th-meta-label">Payment Method:</td>
                  <td className="th-meta-val">{paymentMode.toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="th-meta-label">Bill Status:</td>
                  <td className="th-meta-val">{lastInvoice ? 'PAID' : 'PENDING'}</td>
                </tr>
              </tbody>
            </table>

            <div className="th-words-section">
              <div className="th-words-label">Amount in Words</div>
              <div className="th-words-text">{numberToWordsIndian(finalTotal)}</div>
            </div>

            {/* QR Code */}
            <div className="th-qr-section">
              <img
                src={getUPIQrUrl(company.bankDetails.upiId, company.companyName, finalTotal, currentBillNo)}
                alt="UPI QR Code"
                className="th-qr-image"
              />
              <div className="th-upi-logo-row">
                <span>UPI</span>
                <span className="th-upi-arrows">
                  <span className="th-upi-green">▶</span>
                  <span className="th-upi-orange">▶</span>
                </span>
              </div>
              <div className="th-scan-btn">SCAN TO PAY</div>
            </div>

            <hr className="th-dashed-separator" />

            {/* Terms */}
            <div className="th-tc-section">
              <div className="th-tc-heading">T &amp; C</div>
              <div className="th-tc-line">1. Goods once sold will not be taken back or exchanged.</div>
              <div className="th-tc-line">2. All disputes are subject to jurisdiction only.</div>
            </div>

            <hr className="th-dashed-separator" />

            {/* Footer */}
            <div className="th-footer-section">
              <div className="th-powered-by">
                Powered by <strong>{company.companyName}</strong>
              </div>
              <div className="th-grow-line">Grow with {company.companyName}!</div>
              <div className="th-maroon-banner-1">Thank You, Visit Again.</div>
              <div className="th-maroon-banner-2">Feels Best</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Custom Item Modal */}
      {showCustomItemModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', color: '#000', padding: '1.5rem', borderRadius: '12px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Add Custom Item</h3>
              <button onClick={() => setShowCustomItemModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCustomItem}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Chai, Special Dish..."
                  value={customItemForm.name}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={customItemForm.price}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, price: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={customItemForm.qty}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, qty: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>GST Tax %</label>
                  <select
                    value={customItemForm.taxRate}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, taxRate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Unit</label>
                  <input
                    type="text"
                    value={customItemForm.unit}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setShowCustomItemModal(false)} style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>+ Add to Cart</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Tender Modal */}
      {showCheckoutModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', color: '#000', padding: '2rem', borderRadius: '12px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Tender Payment</h3>
            <div style={{ margin: '1rem 0', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Total Amount Due:</span>
                <strong style={{ fontSize: '1.2rem', color: '#16a34a' }}>₹{finalTotal.toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Payment Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {['Cash', 'UPI', 'Card'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '6px',
                      border: paymentMode === mode ? '2px solid #2563eb' : '1px solid #ccc',
                      background: paymentMode === mode ? '#dbeafe' : '#fff',
                      color: paymentMode === mode ? '#1e40af' : '#000',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Amount Received ({currency})</label>
              <input
                type="number"
                value={tenderedAmount}
                onChange={(e) => setTenderedAmount(e.target.value)}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.1rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[500, 1000, 2000].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTenderedAmount(v)}
                    style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd', background: '#f1f5f9', cursor: 'pointer' }}
                  >
                    {formatPrice(v)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ margin: '1rem 0', padding: '0.8rem', background: '#ecfdf5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', color: '#065f46' }}>
              <span>Change to Return:</span>
              <strong style={{ fontSize: '1.2rem' }}>{formatPrice(changeDue)}</strong>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                style={{ flex: 2, padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✓ Complete Sale &amp; Print
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Real Product Creation Modal */}
      {showNewProductModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', color: '#000', padding: '1.8rem', borderRadius: '12px', width: '460px', maxWidth: '92vw', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Add Real Product to Store</h3>
              </div>
              <button onClick={() => setShowNewProductModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveRealProduct}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Product / Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Lens, Cold Coffee, Wireless Mouse"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Sale Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 299"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>MRP (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 350"
                    value={newProductForm.mrp}
                    onChange={(e) => setNewProductForm({ ...newProductForm, mrp: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>GST Tax %</label>
                  <select
                    value={newProductForm.taxRate}
                    onChange={(e) => setNewProductForm({ ...newProductForm, taxRate: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="0">0% (Exempted)</option>
                    <option value="3">3% (Precious metals / tech)</option>
                    <option value="5">5% (Essentials / Food)</option>
                    <option value="12">12% (Standard)</option>
                    <option value="18">18% (General goods / GST 18%)</option>
                    <option value="28">28% (Luxury / Electronics)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Unit</label>
                  <select
                    value={newProductForm.unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="Piece">Piece</option>
                    <option value="Box">Box</option>
                    <option value="Kg">Kg</option>
                    <option value="Liter">Liter</option>
                    <option value="Packet">Packet</option>
                    <option value="Plate">Plate</option>
                    <option value="Cup">Cup</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px', marginBottom: '1.4rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Food, Electronics, General"
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Initial Stock</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ✓ Save Real Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
