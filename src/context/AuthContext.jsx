import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextValue';
import { authApi } from '../api';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase Auth state — restores session on reload
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }
      try {
        const jwt = await firebaseUser.getIdToken();
        localStorage.setItem('token', jwt);
        const profile = await authApi.getMe();
        setUser(profile);
        setToken(jwt);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const login = (userData, jwtToken) => {
    const normalizedUser = { ...userData, name: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' ') };
    setUser(normalizedUser);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
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
