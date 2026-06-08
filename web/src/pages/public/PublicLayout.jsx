import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth.jsx';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo.jsx';

const CATEGORIES = ['Construction', 'Farm Equipment', 'Commercial Trucks', 'Vehicles', 'Trailers', 'Other'];

export default function PublicLayout({ children }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const isAdmin = user?.role === 'admin';

  function submitSearch(e) {
    e.preventDefault();
    if (q.trim()) navigate(`/browse?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-navy-deep/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />

          <form onSubmit={submitSearch} className="relative hidden flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search equipment, auctions…"
              className="h-10 w-full rounded-md border border-input bg-navy-deep pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </form>

          <nav className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/browse')}>Browse</Button>
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>Admin</Button>
                )}
                <Button size="sm" onClick={() => navigate('/home')}>My Account</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
                <Button size="sm" onClick={() => navigate('/register')}>Register</Button>
              </>
            )}
          </nav>
        </div>
        {/* Category strip */}
        <div className="border-t border-border/50 bg-navy">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2 text-sm sm:px-6 lg:px-8">
            {CATEGORIES.map((c) => (
              <Link key={c} to={`/browse?category=${encodeURIComponent(c)}`} className="whitespace-nowrap text-muted-foreground hover:text-gold">
                {c}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-navy-deep">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-sm text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="font-display text-lg uppercase tracking-wide text-foreground">Strata<span className="text-gold">Bid</span></span>
            <span>A Techtonic platform · Industrial &amp; equipment auctions</span>
            <div className="flex gap-4">
              <button onClick={() => navigate('/register')} className="hover:text-gold">Sell with us</button>
              <button onClick={() => navigate('/login')} className="hover:text-gold">Sign in</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
