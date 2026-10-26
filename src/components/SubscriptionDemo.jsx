import { useState, useContext, useEffect } from 'react';
import { ArrowRight, BadgeCheck, BarChart3, Building2, Check, Crown, ReceiptText, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContextValue';
import { authApi } from '../api';
import { isAdminAccount } from '../subscriptionAccess';
import './SubscriptionDemo.css';

const plans = [
  {
    id: 'Starter',
    price: 999,
    audience: 'For solo businesses and small shops',
    description: 'Get your daily billing into one clear workspace.',
    icon: ReceiptText,
    features: ['Create and manage invoices', 'Organize buyers and products', 'Track everyday business activity']
  },
  {
    id: 'Professional',
    price: 2999,
    audience: 'For growing teams',
    description: 'Connect stock, tax, and reporting as operations grow.',
    icon: BarChart3,
    popular: true,
    features: ['Everything in Starter', 'Inventory and GST tools', 'Business analytics and team workflows']
  },
  {
    id: 'Enterprise',
    price: 9999,
    audience: 'For larger operations',
    description: 'Give broader teams more ways to coordinate.',
    icon: Building2,
    features: ['Everything in Professional', 'Role and access management', 'Advanced platform controls and insights']
  }
];

export default function SubscriptionDemo({ onBack, onLogin, onRegister }) {
  const [loadingPlan, setLoadingPlan] = useState('');
  const [clockNow, setClockNow] = useState(0);
  const [notice, setNotice] = useState(null);
  const { token, user, login } = useContext(AuthContext);

  useEffect(() => {
    const timer = window.setTimeout(() => setClockNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const trialEndTime = user?.trialEndsAt ? new Date(user.trialEndsAt).getTime() : NaN;
  const trialDaysLeft = user?.subscriptionStatus === 'trial' && Number.isFinite(trialEndTime)
    ? Math.max(0, Math.ceil((trialEndTime - clockNow) / (24 * 60 * 60 * 1000)))
    : 0;
  const trialActive = trialDaysLeft > 0;
  const isAdmin = isAdminAccount(user);

  const handleStartTrial = async () => {
    if (!user) {
      onRegister?.();
      return;
    }
    if (trialActive) {
      setNotice({
        type: 'info',
        text: `Your full-access trial is already active for ${trialDaysLeft} more day${trialDaysLeft === 1 ? '' : 's'}. No payment is due.`
      });
      return;
    }
    if (user.trialUsed) {
      setNotice({
        type: 'info',
        text: 'This account has already completed its free trial period. Please select a plan to continue.'
      });
      return;
    }

    try {
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const updatedUser = await authApi.updateProfile({
        subscriptionStatus: 'trial',
        trialEndsAt,
        trialUsed: true
      });
      login(updatedUser, token || localStorage.getItem('token'));
      setNotice({ type: 'success', text: '7-day full access trial activated successfully!' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Unable to start trial. Please try again.' });
    }
  };

  const handlePayment = async (plan) => {
    if (!user) {
      setNotice({ type: 'info', text: 'Please sign in to select a subscription plan.' });
      return;
    }

    setLoadingPlan(plan.id);
    setNotice(null);

    // Instant unlock for Administrator
    if (isAdmin) {
      try {
        const updatedUser = await authApi.updateProfile({
          plan: plan.id.toLowerCase(),
          subscriptionStatus: 'active',
          role: 'admin'
        });
        login(updatedUser, token || localStorage.getItem('token'));
        setNotice({ type: 'success', text: `Administrator Access: ${plan.id} plan activated instantly!` });
      } catch (err) {
        setNotice({ type: 'error', text: err.message || 'Failed to update plan.' });
      } finally {
        setLoadingPlan('');
      }
      return;
    }

    // Direct Firestore Upgrade
    try {
      const updatedUser = await authApi.updateProfile({
        plan: plan.id.toLowerCase(),
        subscriptionStatus: 'active',
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      login(updatedUser, token || localStorage.getItem('token'));
      setNotice({ type: 'success', text: `Success! ${plan.id} plan activated for 30 days.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Unable to activate plan. Please try again.' });
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <div className="subscription-checkout-page fade-in">
      <button className="subscription-back" onClick={onBack}>← Back</button>

      <header className="subscription-heading">
        <span><Crown size={15} aria-hidden="true" /> YOURBILL PLANS</span>
        <h1>Pick the support your business needs.</h1>
        <p>Choose tools for your current workflow, then scale as your operations expand.</p>
      </header>

      {!user && (
        <div className="subscription-login-note">
          <ShieldCheck size={18} />
          <span>Sign in before checkout so your plan is linked to your business account.</span>
          <button onClick={onLogin}>Log in <ArrowRight size={15} /></button>
        </div>
      )}

      {trialActive && (
        <div className="subscription-trial-status">
          <BadgeCheck size={19} />
          <span>
            <strong>Your free trial is active</strong>
            <small>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left · full access unlocked</small>
          </span>
        </div>
      )}

      {notice && (
        <div className={`subscription-notice ${notice.type}`} role="status">
          {notice.type === 'success' ? <BadgeCheck size={19} /> : <ShieldCheck size={19} />}
          <span>{notice.text}</span>
          {notice.type === 'success' && <button onClick={onBack}>Continue <ArrowRight size={15} /></button>}
        </div>
      )}

      <div className="subscription-plan-grid">
        {plans.map(plan => {
          const PlanIcon = plan.icon;
          const isCurrentPlan = user?.plan?.toLowerCase() === plan.id.toLowerCase() && user?.subscriptionStatus === 'active';

          return (
            <article className={`subscription-plan-card${plan.popular ? ' popular' : ''}`} key={plan.id}>
              {plan.popular && <span className="subscription-popular-tag">MOST CHOSEN</span>}
              <div className="subscription-plan-icon"><PlanIcon size={21} aria-hidden="true" /></div>
              <p className="subscription-plan-audience">{plan.audience}</p>
              <h2>{plan.id}</h2>
              <p className="subscription-plan-description">{plan.description}</p>
              <div className="subscription-plan-price">
                ₹{plan.price.toLocaleString('en-IN')}<small> / month</small>
              </div>
              <ul>
                {plan.features.map(feature => (
                  <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>
                ))}
              </ul>
              <button
                className="btn-primary rainbow-bg subscription-plan-button"
                onClick={() => handlePayment(plan)}
                disabled={Boolean(loadingPlan) || isCurrentPlan}
              >
                {loadingPlan === plan.id
                  ? 'Activating…'
                  : isCurrentPlan
                    ? 'Current Plan Active'
                    : `Choose ${plan.id}`
                }
                {!isCurrentPlan && <ArrowRight size={16} aria-hidden="true" />}
              </button>
            </article>
          );
        })}
      </div>

      <div className="subscription-trial-callout">
        <div>
          <span>TRY BEFORE YOU CHOOSE</span>
          <h2>Use every feature free for 7 days.</h2>
          <p>Explore invoicing, stock, and business analytics with zero restrictions. No payment required upfront.</p>
        </div>
        <button
          className="btn-primary rainbow-bg"
          onClick={handleStartTrial}
          disabled={trialActive}
        >
          {trialActive
            ? `Trial active · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`
            : user?.trialUsed
              ? 'Trial already used'
              : user
                ? 'Start 7-day free trial'
                : 'Create account & start trial'
          }
          {!trialActive && !user?.trialUsed && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>

      <p className="subscription-checkout-footnote">
        <ShieldCheck size={15} aria-hidden="true" />
        Plans and upgrades are synced in real-time to your secure Firestore business cloud.
      </p>
    </div>
  );
}