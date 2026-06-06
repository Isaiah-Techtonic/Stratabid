import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, clearToken, getToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // On boot, if we have a token, fetch the current user to restore the session.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Fetch company memberships whenever the user changes — used by the header
  // to decide whether to surface the Admin link for non-admin company members.
  useEffect(() => {
    if (!user) { setCompanies([]); return; }
    api.myCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, [user]);

  async function login(email, password) {
    const res = await api.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }

  async function register(email, fullName, password) {
    const res = await api.register(email, fullName, password);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    clearToken();
    setUser(null);
    setCompanies([]);
  }

  return (
    <AuthContext.Provider value={{ user, companies, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
