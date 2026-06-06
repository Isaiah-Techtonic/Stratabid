import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import AdminPage from '@/pages/AdminPage.jsx';
import AuctionDetailPage from '@/pages/AuctionDetailPage.jsx';
import RegisterPage from '@/pages/RegisterPage.jsx';
import AccountPage from '@/pages/AccountPage.jsx';
import CustomerHome from '@/pages/CustomerHome.jsx';
import CompanyPortal from '@/pages/CompanyPortal.jsx';
import CompanyTeamPage from '@/pages/CompanyTeamPage.jsx';
import '@/index.css';

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/account" element={<Protected><AccountPage /></Protected>} />
      <Route path="/home" element={<Protected><CustomerHome /></Protected>} />
      <Route path="/company" element={<Protected><CompanyPortal /></Protected>} />
      <Route path="/company/:id/team" element={<Protected><CompanyTeamPage /></Protected>} />
      <Route path="/admin" element={<Protected role="admin"><AdminPage /></Protected>} />
      <Route path="/auctions/:id" element={<Protected role="admin"><AuctionDetailPage /></Protected>} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><App /></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
