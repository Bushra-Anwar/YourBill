import { useState, useContext, useEffect } from 'react';
import { ArrowRight, BadgeCheck, BarChart3, Building2, Check, Crown, ReceiptText, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContextValue';
import { authApi } from '../api';
import { isAdminAccount } from '../subscriptionAccess';
import './SubscriptionDemo.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api');
const plans = [
  { id: 'Starter', price: 999, audience: 'For solo businesses and small shops', description: 'Get your daily billing into one clear workspace.', icon: ReceiptText, features: ['Create and manage invoices', 'Organize buyers and products', 'Track everyday business activity'] },
  { id: 'Professional', price: 2999, audience: 'For growing teams', description: 'Connect stock, tax, and reporting as operations grow.', icon: BarChart3, popular: true, features: ['Everything in Starter', 'Inventory and GST tools', 'Business analytics and team workflows'] },
  { id: 'Enterprise', price: 9999, audience: 'For larger operations', description: 'Give broader teams more ways to coordinate.', icon: Building2, features: ['Everything in Professional', 'Role and access management', 'Advanced platform controls and insights'] }
];

export default function SubscriptionDemo({ onBack, onLogin, onRegister }) {
  const [loadingPlan, setLoadingPlan] = useState('');
  const [clockNow, setClockNow] = useState(0);
  useEffect(() => { const timer = window.setTimeout(() => setClockNow(Date.now()), 0); return () => window.clearTimeout(timer); }, []);
  const [notice, setNotice] = useState(null);
  const { token, user, login } = useContext(AuthContext);
  const trialEndTime = user?.trialEndsAt ? new Date(user.trialEndsAt).getTime() : NaN;
  const trialDaysLeft = user?.subscriptionStatus === 'trial' && Number.isFinite(trialEndTime)
    ? Math.max(0, Math.ceil((trialEndTime - clockNow) / (24 * 60 * 60 * 1000)))
    : 0;
  const trialActive = trialDaysLeft > 0;

  const handleStartTrial = async () => {
    if (!user || !token) {
      onRegister?.();
      return;
    }
    if (trialActive) {
      setNotice({ type: 'info', text: `Your full-access trial is already active for ${trialDaysLeft} more day${trialDaysLeft === 1 ? '' : 's'}. No payment is due during the trial.` });
      return;
    }
    if (user.trialUsed || user.trialStartedAt) {
      setNotice({ type: 'info', text: 'This account has already used its 7-day trial. Choose a plan to continue after your trial.' });
      return;
    }
    try {
      const updatedUser = await authApi.startTrial();
      login(updatedUser, token);
      setNotice({ type: 'success', text: 'Your 7-day full-access trial has started. No card is required.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Unable to start the trial. Please try again.' });
    }
  };

  const handlePayment = async (plan) => {
    if (!user || !token) {
      setNotice({ type: 'info', text: 'Log in to your YourBill account to choose a subscription.' });
      return;
    }
    if (isAdminAccount(user)) {
      setLoadingPlan(plan.id);
      setNotice(null);
      try {
        const response = await fetch(`${API_BASE}/payment/admin-activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: plan.id })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.shop) throw new Error(data.message || 'Administrator plan activation failed.');
        login(data.shop, token);
        setNotice({ type: 'success', text: `${plan.id} plan activated for the admin account. No payment was taken.` });
      } catch (err) {
        setNotice({ type: 'error', text: err.message || 'Unable to activate the administrator plan.' });
      } finally {
        setLoadingPlan('');
      }
      return;
    }
    if (!window.Razorpay) {
      setNotice({ type: 'error', text: 'Secure checkout could not load. Check your connection and try again.' });
      return;
    }

    setLoadingPlan(plan.id);
    setNotice(null);
    let checkoutOpened = false;

    try {
      const res = await fetch(`${API_BASE}/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: plan.id })
      });
      const orderData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(orderData.message || 'Unable to start secure checkout.');
      }
      if (!orderData.key_id || !orderData.order?.id) throw new Error('Checkout could not create a payment order. Please try again.');

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: "INR",
        name: "YourBill SaaS",
        description: `YourBill ${plan.id} subscription`,
        order_id: orderData.order.id,
        handler: async function (response) {
          try {
            setLoadingPlan(plan.id);
            const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (verifyRes.ok) {
              const updatedShop = verifyData.shop || {};
              const paidUser = await authApi.updateSubscription({ plan: updatedShop.plan || plan.id, subscriptionStatus: updatedShop.subscriptionStatus || 'active' });
              login(paidUser, token);
              setNotice({ type: 'success', text: `${plan.id} plan is active. Your account is ready to use it.` });
            } else {
              throw new Error(verifyData.message || 'Payment verification failed. Your subscription was not changed.');
            }
          } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: err.message || 'Payment verification failed. Please contact support before retrying.' });
          } finally {
            setLoadingPlan('');
          }
        },
        prefill: {
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '',
          email: user.email,
        },
        theme: {
          color: "#7256d6"
        },
        modal: { ondismiss: () => setLoadingPlan('') }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', event => {
        setLoadingPlan('');
        setNotice({ type: 'error', text: event.error?.description || 'Payment failed. You have not been charged for an unsuccessful payment.' });
      });
      rzp.open();
      checkoutOpened = true;

    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: err.message || 'Unable to start payment. Please try again.' });
    } finally {
      if (!checkoutOpened) setLoadingPlan('');
    }
  };

  return (
    <div className="subscription-checkout-page fade-in">
      <button className="subscription-back" onClick={onBack}>← Back</button>
      <header className="subscription-heading">
        <span><Crown size={15} aria-hidden="true" /> YOURBILL PLANS</span>
        <h1>Pick the support your business needs.</h1>
        <p>Choose tools for your current workflow, then move up as your team and operations grow.</p>
      </header>
      {!user && <div className="subscription-login-note"><ShieldCheck size={18} /><span>Sign in before checkout so the plan is applied to the right business.</span><button onClick={onLogin}>Log in <ArrowRight size={15} /></button></div>}
      {trialActive && <div className="subscription-trial-status"><BadgeCheck size={19} /><span><strong>Your free trial is active</strong><small>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left · full access · no card required</small></span></div>}
      {notice && <div className={`subscription-notice ${notice.type}`} role="status">{notice.type === 'success' ? <BadgeCheck size={19} /> : <ShieldCheck size={19} />}<span>{notice.text}</span>{notice.type === 'success' && <button onClick={onBack}>Continue <ArrowRight size={15} /></button>}</div>}
      <div className="subscription-plan-grid">
        {plans.map(plan => {
          const PlanIcon = plan.icon;
          return (
            <article className={`subscription-plan-card${plan.popular ? ' popular' : ''}`} key={plan.id}>
              {plan.popular && <span className="subscription-popular-tag">MOST CHOSEN</span>}
              <div className="subscription-plan-icon"><PlanIcon size={21} aria-hidden="true" /></div>
              <p className="subscription-plan-audience">{plan.audience}</p>
              <h2>{plan.id}</h2>
              <p className="subscription-plan-description">{plan.description}</p>
              <div className="subscription-plan-price">₹{plan.price.toLocaleString('en-IN')}<small> / month</small></div>
              <ul>{plan.features.map(feature => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul>
              <button className="btn-primary rainbow-bg subscription-plan-button" onClick={() => handlePayment(plan)} disabled={Boolean(loadingPlan)}>
                {loadingPlan === plan.id ? 'Opening secure checkout…' : `Choose ${plan.id}`} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
      <div className="subscription-trial-callout">
        <div><span>TRY BEFORE YOU CHOOSE</span><h2>Use every feature free for 7 days.</h2><p>Explore invoicing, stock, and business insights with your own account. No card required. Your trial can only be used once per account.</p></div>
        <button className="btn-primary rainbow-bg" onClick={handleStartTrial} disabled={trialActive}>
          {trialActive ? `Trial active · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` : user?.trialUsed || user?.trialStartedAt ? 'Trial already used' : user ? 'Start 7-day free trial' : 'Create account & start trial'}
          {!trialActive && !(user?.trialUsed || user?.trialStartedAt) && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>
      <p className="subscription-checkout-footnote"><ShieldCheck size={15} aria-hidden="true" /> Payments are processed through secure Razorpay checkout. Your plan activates only after payment verification.</p>
    </div>
  );
}
