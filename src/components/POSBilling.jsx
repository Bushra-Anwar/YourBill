import React, { useState, useEffect, useCallback } from 'react';
import { Search, Printer } from 'lucide-react';
import './POSBilling.css';
import { productApi, invoiceApi } from '../api';
import { AuthContext } from '../context/AuthContextValue';

export default function POSBilling({ onBack }) {
  const { user } = React.useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const currency = user?.currency || '₹';
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await productApi.getAll();
      if (data && data.length > 0) {
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { loadProducts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const formatPrice = amount => `${currency}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const addItemToCart = (product) => {
    const existing = cartItems.find(item => item._id === product._id);
    if (product.type === 'Physical Product' && Number(existing?.qty || 0) >= Number(product.stock || 0)) {
      alert('Available stock is not enough for another item.');
      return;
    }
    setCartItems(prev => {
      const cartProduct = prev.find(item => item._id === product._id);
      if (cartProduct) {
        return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    const cartItem = cartItems.find(item => item._id === id);
    const product = products.find(item => item._id === id);
    if (delta > 0 && product?.type === 'Physical Product' && Number(cartItem?.qty || 0) >= Number(product.stock || 0)) {
      alert('Available stock is not enough for another item.');
      return;
    }
    setCartItems(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const handleReset = () => {
    setCartItems([]);
    setLastInvoice(null);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = cartItems.reduce((sum, item) => {
    let taxPercent = 0;
    if (item.taxRate) {
      const p = parseFloat(String(item.taxRate).replace(/[^0-9.]/g, ''));
      if (!isNaN(p)) taxPercent = p;
    }
    return sum + (((item.price || 0) * (item.qty || 1) * taxPercent) / 100);
  }, 0);

  const finalTotal = subtotal + taxAmount;
  const changeDue = Math.max(0, (parseFloat(tenderedAmount) || finalTotal) - finalTotal);

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return alert('Cart is empty! Add products first.');
    if ((parseFloat(tenderedAmount) || 0) < finalTotal) return alert('Received amount must cover the total payable.');

    try {
      const invoiceNumber = undefined;
      const payload = {
        invoiceNumber,
        customerName: 'Walk-in Retail Customer',
        type: 'POS Bill',
        items: cartItems.map(item => {
          const taxPercent = item.taxRate ? parseFloat(String(item.taxRate).replace(/[^0-9.]/g, '')) || 0 : 0;
          const baseAmount = (Number(item.price) || 0) * item.qty;
          return {
            productId: item._id,
            name: item.name,
            sku: item.sku || '',
            hsnCode: item.hsnCode || '',
            quantity: item.qty,
            qty: item.qty,
            rate: item.price,
            taxRate: taxPercent,
            amount: baseAmount + (baseAmount * taxPercent / 100)
          };
        }),
        subtotal,
        totalTax: taxAmount,
        grandTotal: finalTotal,
        totalAmount: finalTotal,
        paidAmount: finalTotal,
        balanceAmount: 0,
        paymentStatus: 'Paid',
        paymentMethod: paymentMode,
        notes: `Tendered: ${currency}${tenderedAmount || finalTotal}, Change: ${currency}${changeDue.toFixed(2)}`
      };

      const saved = await invoiceApi.create(payload);
      setLastInvoice(saved);
      setShowCheckoutModal(false);
      alert(`Sale completed! Receipt #${saved.invoiceNumber} recorded in the database.`);
      setCartItems([]);
      setTenderedAmount('');
      // Reload products to show updated stock
      await loadProducts();
    } catch (error) {
      console.error('POS Sale error:', error);
      alert(`Error completing sale: ${error.message}`);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="pos-wrapper fade-in">
      <div className="pos-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="pos-back-btn" onClick={onBack}>← Back to Dashboard</button>
          <h2 className="pos-main-title">Fast POS Terminal</h2>
        </div>
        <div className="pos-top-actions">
          <span className="pos-currency-label">Currency · {currency}</span>
          <button className="pos-btn-share" onClick={() => window.print()}>
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>

      <div className="pos-grid">
        {/* Left Column: Product Picker */}
        <div className="pos-col pos-left-col">
          <div className="pos-left-header">
            <div>
              <p className="pos-label">Live Catalog</p>
              <h3>{products.length} Items</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="pos-label">In Cart</p>
              <h3>{cartItems.reduce((sum, item) => sum + item.qty, 0)} Pcs</h3>
            </div>
          </div>

          <div className="pos-left-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, SKU or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="pos-products-grid" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {filteredProducts.map(product => (
              <button
                key={product._id}
                className="pos-grid-btn"
                onClick={() => addItemToCart(product)}
                style={{ textAlign: 'left', padding: '0.8rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem' }}>{product.image || '📦'}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Stock: {product.stock}</span>
                </div>
                <strong style={{ display: 'block', fontSize: '0.85rem', margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </strong>
                <span className="btn-val" style={{ color: '#10b981', fontWeight: 'bold' }}>
                  {formatPrice(product.price || 0)}
                </span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#a3aed0', padding: '2rem' }}>
                No products found matching "{searchTerm}".
              </p>
            )}
          </div>

          <div className="pos-bottom-actions">
            <div className="pos-action-row-1">
              <button className="pos-btn-large bg-gray" onClick={() => setSearchTerm('')}>Clear Filter</button>
              <button className="pos-btn-large bg-green text-white" onClick={handleReset}>Clear Cart</button>
            </div>
          </div>
        </div>

        {/* Middle Column: Cart Breakdown */}
        <div className="pos-col pos-mid-col">
          <div className="pos-mid-header">
            <div>
              <p className="pos-label">Current Basket</p>
              <h3>{cartItems.length} Unique Items</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="pos-label">Total Payable</p>
              <h3 style={{ color: '#10b981' }}>{formatPrice(finalTotal)}</h3>
            </div>
          </div>

          <div className="pos-cart-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {cartItems.map(item => (
              <div key={item._id} className="pos-cart-item" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '1.6rem' }}>{item.image || '📦'}</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.9rem', display: 'block' }}>{item.name}</strong>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{formatPrice(item.price)} each</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => updateQuantity(item._id, -1)} style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}>-</button>
                  <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQuantity(item._id, 1)} style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}>+</button>
                </div>
                <div style={{ fontWeight: 'bold', minWidth: '70px', textAlign: 'right' }}>
                  {formatPrice(item.price * item.qty)}
                </div>
              </div>
            ))}
            {cartItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
                🛒 Cart is empty. Click items on the left to add.
              </div>
            )}
          </div>

          <div className="pos-mid-footer">
            <div className="pos-summary-row">
              <span>Subtotal:</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div className="pos-summary-row text-green">
              <span>Taxes (GST):</span>
              <strong>{formatPrice(taxAmount)}</strong>
            </div>
            <div className="pos-summary-row grand-total-row">
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Grand Total:</span>
              <strong style={{ fontSize: '1.2rem', color: '#6b21a8' }}>{formatPrice(finalTotal)}</strong>
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

        {/* Right Column: Thermal Receipt Preview */}
        <div className="pos-col pos-right-col">
          <div className="pos-receipt">
            <div className="receipt-header">
              <h3>TAX INVOICE / RECEIPT</h3>
              <p>{user?.companyName || 'Your business'}</p>
              {user?.gstin && <p>GSTIN: {user.gstin}</p>}
              <p>{lastInvoice?.date ? new Date(lastInvoice.date).toLocaleString() : 'Receipt preview'}</p>
            </div>
            <div className="receipt-body">
              {cartItems.map(item => (
                <div key={item._id} className="receipt-row">
                  <span>{item.name.substring(0, 18)} (x{item.qty})</span>
                  <span>{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="receipt-row">
                <span>GST Tax</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
              <div className="receipt-grand-total">
                <span>TOTAL</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
              <div className="receipt-divider"></div>
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
                <p>Thank you for shopping with us!</p>
                <p>Goods once sold cannot be returned.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Tender Modal */}
      {showCheckoutModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', color: '#000', padding: '2rem', borderRadius: '12px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Tender Payment</h3>
            <div style={{ margin: '1rem 0', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Total Amount Due:</span>
                <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>₹{finalTotal.toFixed(2)}</strong>
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
                      border: paymentMode === mode ? '2px solid #6b21a8' : '1px solid #ccc',
                      background: paymentMode === mode ? '#f3e8ff' : '#fff',
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
                style={{ flex: 2, padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ✓ Confirm Sale & Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
