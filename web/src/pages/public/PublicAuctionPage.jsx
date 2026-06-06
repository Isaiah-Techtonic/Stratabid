import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import PublicLayout from './PublicLayout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package } from 'lucide-react';

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return null; }
}

export default function PublicAuctionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.pubAuctionDetail(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <PublicLayout><div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">{error}</div></PublicLayout>;
  if (!data) return <PublicLayout><div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Loading…</div></PublicLayout>;

  const { auction, lots } = data;

  return (
    <PublicLayout>
      {/* Auction header */}
      <section className="border-b border-border bg-navy">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Badge status={auction.status}>{auction.status}</Badge>
          <h1 className="mt-2 text-3xl">{auction.title}</h1>
          <p className="mt-1 text-muted-foreground">{auction.auction_companies?.name}</p>
          {auction.description && <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{auction.description}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {fmtDate(auction.starts_at) && <span>Starts: {fmtDate(auction.starts_at)}</span>}
            {fmtDate(auction.ends_at) && <span>Ends: {fmtDate(auction.ends_at)}</span>}
            {(auction.location_city || auction.location_state) && (
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[auction.location_city, auction.location_state].filter(Boolean).join(', ')}</span>
            )}
          </div>
        </div>
      </section>

      {/* Lots */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl">Lots ({lots.length})</h2>
        {lots.length === 0 ? (
          <Card><CardContent className="pt-6 text-muted-foreground">No lots have been published for this auction yet.</CardContent></Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {lots.map((l) => (
              <Card key={l.id} className="cursor-pointer transition-colors hover:border-gold" onClick={() => navigate(`/l/${l.id}`)}>
                <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-navy">
                  {l.photos?.[0]
                    ? <img src={l.photos[0]} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center"><Package className="h-8 w-8 opacity-30 text-muted-foreground" /></div>}
                </div>
                <CardContent className="pt-3">
                  {l.lot_number != null && <span className="text-xs uppercase tracking-wide text-muted-foreground">Lot {l.lot_number}</span>}
                  <h3 className="text-base leading-tight">{l.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{[l.make, l.model, l.year].filter(Boolean).join(' ')}</p>
                  <p className="mt-2 text-sm">Starting: <span className="text-gold">${l.starting_bid ?? 0}</span></p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
