import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContextValue';
import { authApi } from '../api';

const Registration = ({ setActiveTab }) => {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    gstin: '',
    adminBootstrapSecret: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isAdminEmail = formData.email.trim().toLowerCase() === (import.meta.env.VITE_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.companyName.trim()) {
      setError('Please enter your business/shop name.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        gstin: formData.gstin
      };
      if (isAdminEmail && formData.adminBootstrapSecret) {
        payload.adminBootstrapSecret = formData.adminBootstrapSecret;
      }
      const data = await authApi.register(payload);
      login(data.user, data.token);
      setActiveTab('Dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-view fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚀</div>
          <h2>Create Account</h2>
          <p>Join <span className="rainbow-text">YourBill</span> and get 7 days of full access — no card required</p>
        </div>

        {error && (
          <div style={{
            color: '#ef4444',
            marginBottom: '1rem',
            textAlign: 'center',
            padding: '0.75rem 1rem',
            background: 'rgba(239,68,68,0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '0.9rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Your Full Name *</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label>Business / Shop Name *</label>
            <input
              type="text"
              name="companyName"
              placeholder="e.g. Sharma Electronics"
              value={formData.companyName}
              onChange={handleChange}
              required
              autoComplete="organization"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>
            <div className="input-group">
              <label>GSTIN (optional)</label>
              <input
                type="text"
                name="gstin"
                placeholder="22AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Email Address *</label>
            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label>Password * (min 8 characters)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Confirm Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              style={{ borderColor: formData.confirmPassword && formData.password !== formData.confirmPassword ? '#ef4444' : '' }}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <small style={{ color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>Passwords do not match</small>
            )}
          </div>

          {isAdminEmail && (
            <div className="input-group">
              <label>Administrator Setup Code</label>
              <input
                type="password"
                name="adminBootstrapSecret"
                placeholder="Provided by the platform owner"
                value={formData.adminBootstrapSecret}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
          )}

          <button
            className="btn-primary rainbow-bg full-width"
            type="submit"
            disabled={loading || (formData.confirmPassword && formData.password !== formData.confirmPassword)}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Creating Account...
              </span>
            ) : '🚀 Create Account & Start Free Trial'}
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ display: 'block', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveTab('Login'); }}
              className="rainbow-text"
              style={{ fontWeight: 600, textDecoration: 'none' }}
            >
              Login here
            </a>
          </span>
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            🔒 By registering, you get 7 days free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registration;
