import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth.jsx';
import { Gavel, LogOut, User, Building2, Home, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-navy-deep/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gold">
              <Gavel className="h-5 w-5 text-navy-deep" />
            </span>
            <span className="font-display text-2xl uppercase tracking-wide">
              Strata<span className="text-gold">Bid</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && <Badge>Master Admin</Badge>}
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4" /> Home
            </Button>
            {user?.role === 'admin' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                <Shield className="h-4 w-4" /> Admin
              </Button>
            )}
            {user?.role !== 'admin' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/company')}>
                <Building2 className="h-4 w-4" /> Portal
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/account')}>
              <User className="h-4 w-4" /> Account
            </Button>
            <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
