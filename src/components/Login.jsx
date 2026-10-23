import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContextValue';
import { authApi } from '../api';

const Login = ({ setActiveTab }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      login(data.user, data.token);
      setActiveTab('Dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-view fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👋</div>
          <h2>Welcome Back</h2>
          <p>Login to your <span className="rainbow-text">YourBill</span> account</p>
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
            <label>Email Address</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            className="btn-primary rainbow-bg full-width"
            type="submit"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Signing in...
              </span>
            ) : '🔐 Sign In'}
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span style={{ display: 'block', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            Don't have an account?{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveTab('Registration'); }}
              className="rainbow-text"
              style={{ fontWeight: 600, textDecoration: 'none' }}
            >
              Register here
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
