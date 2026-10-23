
import { ShoppingCart, Link2, Store } from 'lucide-react';
import './EcommerceIntegration.css';

export default function EcommerceIntegration({ onBack }) {
  return (
    <div className="ecommerce-integration-wrapper ei-view fade-in">
      <div className="ei-header">
        <div>
          <button className="back-btn" onClick={onBack}>← Back to Home</button>
          <h2 className="ei-title">E-commerce Integration</h2>
          <p className="ei-subtitle">Connect a sales channel to sync orders and fulfillment activity.</p>
        </div>
      </div>

      <div className="grid-3">
        {['Shopify', 'WooCommerce', 'Amazon'].map((store) => (
          <section className="ei-section" key={store}>
            <div className="metric-icon bg-purple"><Store size={22} /></div>
            <h3>{store}</h3>
            <p className="sub-text">Not connected</p>
            <button className="btn-secondary" disabled title="Store connection is not configured yet">
              <Link2 size={16} /> Connect store
            </button>
          </section>
        ))}
      </div>

      <section className="ei-section" style={{ marginTop: '1.25rem' }}>
        <div className="metric-icon bg-blue"><ShoppingCart size={22} /></div>
        <h3>Orders and activity</h3>
        <p className="sub-text">No store is connected, so there are no synced orders, carts, shipments, or refunds to show.</p>
        <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          Connect a store when integration setup is available to see its real activity here.
        </div>
      </section>
    </div>
  );
}
