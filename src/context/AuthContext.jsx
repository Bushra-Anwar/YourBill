import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextValue';
import { authApi } from '../api';


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const restoreAccount = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) { if (mounted) setLoading(false); return; }
      try {
        const savedUser = await authApi.getMe();
        if (mounted) { setUser(savedUser); setToken(savedToken); }
      } catch {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        if (mounted) { setUser(null); setToken(null); }
      } finally { if (mounted) setLoading(false); }
    };
    restoreAccount();
    return () => { mounted = false; };
  }, []);

  const login = (userData, jwtToken) => {
    const normalizedUser = { ...userData, name: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' ') };
    setUser(normalizedUser);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
