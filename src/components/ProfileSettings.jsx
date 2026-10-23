import { useContext, useState } from 'react';
import { ArrowLeft, Bell, Building2, Check, LockKeyhole, Moon, Sun, UserRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContextValue';
import { authApi } from '../api';
import './ProfileSettings.css';

const ProfileSettings = ({ onBack, theme, toggleTheme }) => {
  const { user, setUser } = useContext(AuthContext);
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    companyName: user?.companyName || user?.shopName || '',
    phone: user?.phone || '',
    gstin: user?.gstin || '',
    pan: user?.pan || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || ''
  }));
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [preferences, setPreferences] = useState(() => {
    try { return { lowStockAlerts: true, ...JSON.parse(localStorage.getItem('yourbill-profile-preferences') || '{}') }; }
    catch { return { lowStockAlerts: true }; }
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const saveProfile = async event => {
    event.preventDefault();
    setNotice(''); setError(''); setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in again to save changes.');

      // Build the payload with all editable fields
      const [firstName, ...lastParts] = (form.name || '').trim().split(/\s+/);
      const changes = {
        firstName: firstName || '',
        lastName: lastParts.join(' ') || '',
        companyName: form.companyName,
        phone: form.phone,
        gstin: form.gstin,
        pan: form.pan,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(changes)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not save your profile.');

      const updated = {
        ...user,
        ...data,
        name: [data.firstName, data.lastName].filter(Boolean).join(' ') || user?.name
      };
      setUser(updated);
      localStorage.setItem('currentUser', JSON.stringify(updated));
      setNotice('Profile saved successfully!');
    } catch (saveError) {
      setError(saveError.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async event => {
    event.preventDefault(); setNotice(''); setError('');
    if (passwords.next.length < 8) { setError('Use at least 8 characters for your new password.'); return; }
    if (passwords.next !== passwords.confirm) { setError('The new passwords do not match.'); return; }
    setSaving(true);
    try {
      await authApi.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setNotice('Password updated successfully!');
    } catch (saveError) {
      setError(saveError.message || 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = next => {
    setPreferences(next);
    localStorage.setItem('yourbill-profile-preferences', JSON.stringify(next));
    window.dispatchEvent(new Event('yourbill-profile-preferences-changed'));
    setNotice('Preferences saved.'); setError('');
  };

  return (
    <main className="profile-settings-page fade-in">
      <header className="ps-heading">
        <div>
          <button className="back-btn ps-back" onClick={onBack}><ArrowLeft size={16} /> Back</button>
          <p className="ps-eyebrow">ACCOUNT</p>
          <h1>Profile &amp; Settings</h1>
          <p className="ps-subtitle">Manage your account details, security, and preferences.</p>
        </div>
        <div className="ps-user-chip">
          <span>{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user?.name || 'Account holder'}</strong>
            <small>{user?.email || 'Signed out'}</small>
          </div>
        </div>
      </header>

      <div className="ps-layout">
        <nav className="ps-nav" aria-label="Settings sections">
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><UserRound size={18} /> Personal profile</button>
          <button className={tab === 'business' ? 'active' : ''} onClick={() => setTab('business')}><Building2 size={18} /> Business details</button>
          <button className={tab === 'preferences' ? 'active' : ''} onClick={() => setTab('preferences')}><Bell size={18} /> Preferences</button>
          <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}><LockKeyhole size={18} /> Security</button>
        </nav>

        <section className="ps-panel">
          {notice && <div className="ps-message success"><Check size={16} /> {notice}</div>}
          {error && <div className="ps-message error">{error}</div>}

          {tab === 'profile' && (
            <form onSubmit={saveProfile}>
              <div className="ps-panel-title">
                <div><h2>Personal profile</h2><p>Your name and contact information.</p></div>
              </div>
              <label className="ps-field">
                Full name
                <input name="name" value={form.name} onChange={updateForm} placeholder="Your name" required />
              </label>
              <label className="ps-field">
                Email address
                <input value={user?.email || ''} readOnly disabled />
                <small>Email is used to sign in and cannot be changed here.</small>
              </label>
              <label className="ps-field">
                Phone number
                <input name="phone" type="tel" value={form.phone} onChange={updateForm} placeholder="Add a phone number" />
              </label>
              <div className="ps-actions">
                <button className="btn-primary rainbow-bg" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          )}

          {tab === 'business' && (
            <form onSubmit={saveProfile}>
              <div className="ps-panel-title">
                <div><h2>Business details</h2><p>Business name, GST, and address information.</p></div>
              </div>
              <label className="ps-field">
                Business / shop name
                <input name="companyName" value={form.companyName} onChange={updateForm} placeholder="Your business name" />
              </label>
              <label className="ps-field">
                GSTIN
                <input name="gstin" value={form.gstin} onChange={updateForm} placeholder="e.g. 22AAAAA0000A1Z5" />
              </label>
              <label className="ps-field">
                PAN Number
                <input name="pan" value={form.pan} onChange={updateForm} placeholder="e.g. ABCDE1234F" />
              </label>
              <label className="ps-field">
                Address
                <input name="address" value={form.address} onChange={updateForm} placeholder="Street address" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <label className="ps-field">
                  City
                  <input name="city" value={form.city} onChange={updateForm} placeholder="City" />
                </label>
                <label className="ps-field">
                  State
                  <input name="state" value={form.state} onChange={updateForm} placeholder="State" />
                </label>
                <label className="ps-field">
                  Pincode
                  <input name="pincode" value={form.pincode} onChange={updateForm} placeholder="Pincode" />
                </label>
              </div>
              <div className="ps-actions">
                <button className="btn-primary rainbow-bg" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          )}

          {tab === 'preferences' && (
            <div className="ps-preferences">
              <div className="ps-panel-title">
                <div><h2>Preferences</h2><p>Choose how YourBill looks and which local alerts you want to see.</p></div>
              </div>
              <button className="ps-setting-row" onClick={toggleTheme}>
                <span className="ps-setting-icon">{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</span>
                <span><strong>Appearance</strong><small>Use {theme === 'dark' ? 'light' : 'dark'} theme</small></span>
                <span className="ps-action-text">Change</span>
              </button>
              <label className="ps-setting-row">
                <span className="ps-setting-icon"><Bell size={18} /></span>
                <span><strong>Low stock alerts</strong><small>Show low stock items in the dashboard notification list.</small></span>
                <input type="checkbox" checked={preferences.lowStockAlerts} onChange={e => savePreferences({ ...preferences, lowStockAlerts: e.target.checked })} />
              </label>
            </div>
          )}

          {tab === 'security' && (
            <form onSubmit={savePassword}>
              <div className="ps-panel-title">
                <div><h2>Password &amp; security</h2><p>Choose a password you do not use on other websites.</p></div>
              </div>
              <label className="ps-field">
                Current password
                <input type="password" autoComplete="current-password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} required />
              </label>
              <label className="ps-field">
                New password
                <input type="password" autoComplete="new-password" value={passwords.next} onChange={e => setPasswords({ ...passwords, next: e.target.value })} minLength={8} required />
                <small>At least 8 characters.</small>
              </label>
              <label className="ps-field">
                Confirm new password
                <input type="password" autoComplete="new-password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} minLength={8} required />
              </label>
              <div className="ps-actions">
                <button className="btn-primary rainbow-bg" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
};

export default ProfileSettings;
