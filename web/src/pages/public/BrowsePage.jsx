import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import PublicLayout from './PublicLayout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel, MapPin } from 'lucide-react';

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return null; }
}

export default function BrowsePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    api.pubAuctions(query).then(setAuctions).catch(() => {}).finally(() => setLoading(false));
  }, [q]);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl">{q ? `Results for "${q}"` : 'Browse Auctions'}</h1>
        <p className="mt-1 text-muted-foreground">{auctions.length} auction{auctions.length === 1 ? '' : 's'}</p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : auctions.length === 0 ? (
          <Card className="mt-8"><CardContent className="pt-6 text-muted-foreground">No auctions found.</CardContent></Card>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((a) => (
              <Card key={a.id} className="cursor-pointer transition-colors hover:border-gold" onClick={() => navigate(`/a/${a.id}`)}>
                <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg bg-navy">
                  {a.cover_image_url
                    ? <img src={a.cover_image_url} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center"><Gavel className="h-10 w-10 opacity-30 text-muted-foreground" /></div>}
                </div>
                <CardContent className="pt-4">
                  <Badge status={a.status}>{a.status}</Badge>
                  <h3 className="mt-2 text-lg leading-tight">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.auction_companies?.name}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {fmtDate(a.starts_at) && <span>Starts {fmtDate(a.starts_at)}</span>}
                    {(a.location_city || a.location_state) && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[a.location_city, a.location_state].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
