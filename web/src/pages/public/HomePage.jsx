import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import PublicLayout from './PublicLayout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gavel, MapPin, ArrowRight } from 'lucide-react';

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return null; }
}

function AuctionCard({ a, onClick }) {
  return (
    <Card className="cursor-pointer transition-colors hover:border-gold" onClick={onClick}>
      <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg bg-navy">
        {a.cover_image_url
          ? <img src={a.cover_image_url} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center text-muted-foreground"><Gavel className="h-10 w-10 opacity-30" /></div>}
      </div>
      <CardContent className="pt-4">
        <div className="mb-1 flex items-center gap-2">
          <Badge status={a.status}>{a.status}</Badge>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{a.format === 'live_webcast' ? 'Live' : 'Timed'}</span>
        </div>
        <h3 className="text-lg leading-tight">{a.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{a.auction_companies?.name}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {fmtDate(a.starts_at) && <span>Starts {fmtDate(a.starts_at)}</span>}
          {(a.location_city || a.location_state) && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[a.location_city, a.location_state].filter(Boolean).join(', ')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pubFeatured().then(setFeatured).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-navy-deep to-navy">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-5xl uppercase tracking-wide sm:text-6xl">
            Industrial Equipment <span className="text-gold">Auctions</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Heavy equipment, trucks, trailers, and machinery — sold by trusted regional auction companies.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/browse')}>Browse Auctions <ArrowRight className="h-4 w-4" /></Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/register')}>Sell Equipment</Button>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl">Featured Auctions</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/browse')}>View all <ArrowRight className="h-4 w-4" /></Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : featured.length === 0 ? (
          <Card><CardContent className="pt-6 text-muted-foreground">No upcoming auctions right now. Check back soon.</CardContent></Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a) => <AuctionCard key={a.id} a={a} onClick={() => navigate(`/a/${a.id}`)} />)}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
