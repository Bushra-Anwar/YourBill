import { useState } from 'react';
import { ArrowUpRight, Menu, X, ReceiptText, CreditCard, ChartColumnIncreasing, Sparkles, Check } from 'lucide-react';
import './PremiumHero.css';

export default function PremiumHero({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (tab) => { setMenuOpen(false); onNavigate(tab); };
  const explore = () => {
    navigate('Explore');
    window.setTimeout(() => document.getElementById('tier-buyer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  return (
    <section className="premium-hero" aria-labelledby="premium-hero-title">
      <div className="premium-hero-glow" aria-hidden="true" />
      <header className="premium-hero-header">
        <button className="premium-hero-brand" onClick={() => navigate('Home')} aria-label="YourBill home">
          <span className="premium-brand-mark">Y</span><span>YourBill</span>
        </button>
        <nav className={`premium-hero-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <button onClick={() => navigate('Home')}>Home</button>
          <button onClick={explore}>Features</button>
          <button onClick={() => navigate('POSBilling')}>Billing</button>
          <button onClick={() => navigate('SubscriptionDemo')}>Plans</button>
        </nav>
        <div className="premium-hero-header-actions">
          <button className="premium-hero-login" onClick={() => navigate('Login')}>Log in</button>
          <button className="premium-hero-start" onClick={() => navigate('Registration')}>Get started <ArrowUpRight size={15} /></button>
          <button className="premium-hero-menu" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="premium-hero-mobile-nav" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <div id="premium-hero-mobile-nav" className={`premium-mobile-nav ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <button onClick={() => navigate('Home')}>Home</button><button onClick={explore}>Features</button><button onClick={() => navigate('POSBilling')}>Billing</button><button onClick={() => navigate('SubscriptionDemo')}>Plans</button><button onClick={() => navigate('Login')}>Log in</button><button onClick={() => navigate('Registration')}>Get started</button>
      </div>

      <div className="premium-hero-main">
        <div className="premium-hero-copy">
          <div className="premium-eyebrow"><span className="premium-eyebrow-dot" /> SIMPLE TOOLS. CLEARER BUSINESS.</div>
          <h1 id="premium-hero-title">Smarter billing.<br /><span>Simpler business.</span></h1>
          <p className="premium-hero-description">Create invoices, manage payments, and keep your business finances organized in one calm, connected workspace.</p>
          <div className="premium-hero-ctas">
            <button className="premium-hero-start premium-hero-primary" onClick={() => navigate('Registration')}>Get started <ArrowUpRight size={17} /></button>
            <button className="premium-hero-secondary" onClick={explore}>Explore features <span className="premium-secondary-arrow">↘</span></button>
          </div>
          <div className="premium-trust-note"><span><Check size={13} /></span> Invoicing, inventory, and insights in one place</div>
        </div>

        <div className="premium-hero-visual" aria-label="Sample billing interface preview">
          <div className="premium-orbit premium-orbit-one" aria-hidden="true" /><div className="premium-orbit premium-orbit-two" aria-hidden="true" />
          <div className="premium-float-label premium-float-invoice"><ReceiptText size={16} /> Invoices</div>
          <div className="premium-float-label premium-float-paid"><span className="premium-status-dot" /> Payment tracking</div>
          <article className="premium-invoice-card">
            <div className="premium-card-top"><div><div className="premium-card-kicker">YOURBILL · PREVIEW</div><h2>Billing overview</h2></div><span className="premium-card-icon"><ReceiptText size={19} /></span></div>
            <div className="premium-sample-label"><Sparkles size={12} /> Sample preview · not account data</div>
            <div className="premium-invoice-summary"><div><span className="premium-label-muted">INVOICE TOTAL</span><strong>₹2,450.00</strong></div><span className="premium-paid-pill"><i /> Paid</span></div>
            <div className="premium-invoice-meta"><span>Sample invoice</span><b>INV-2048</b></div>
            <div className="premium-progress-label"><span>Payment status</span><span>Complete</span></div>
            <div className="premium-progress-track"><span /></div>
            <div className="premium-card-footer"><span><CreditCard size={14} /> Payment recorded</span><span>Preview</span></div>
          </article>
          <div className="premium-float-note"><ChartColumnIncreasing size={15} /><span>One connected workspace</span></div>
        </div>
      </div>

      <div className="premium-hero-bottom">
        <div className="premium-feature-highlights" aria-label="Product features">
          <span><i>01</i> Invoicing</span><b aria-hidden="true" /><span><i>02</i> Payment tracking</span><b aria-hidden="true" /><span><i>03</i> Business insights</span>
        </div>
        <button className="premium-bottom-link" onClick={explore}>Explore billing features <ArrowUpRight size={15} /></button>
      </div>
    </section>
  );
}
