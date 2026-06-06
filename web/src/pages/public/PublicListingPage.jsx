import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth.jsx';
import PublicLayout from './PublicLayout.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';

function Spec({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between border-b border-border py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}

export default function PublicListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lot, setLot] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    api.pubListingDetail(id).then((l) => { setLot(l); setActive(0); }).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <PublicLayout><div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">{error}</div></PublicLayout>;
  if (!lot) return <PublicLayout><div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Loading…</div></PublicLayout>;

  const photos = lot.photos || [];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {lot.auctions && (
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(`/a/${lot.auctions.id}`)}>
            <ArrowLeft className="h-4 w-4" /> Back to {lot.auctions.title}
          </Button>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-navy">
              {photos[active]
                ? <img src={photos[active]} alt="" className="h-full w-full object-contain" />
                : <div className="flex h-full items-center justify-center"><Package className="h-12 w-12 opacity-30 text-muted-foreground" /></div>}
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {photos.map((p, i) => (
                  <button key={i} onClick={() => setActive(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${i === active ? 'border-gold' : 'border-border'}`}>
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {lot.lot_number != null && <span className="text-sm uppercase tracking-wide text-muted-foreground">Lot {lot.lot_number}</span>}
            <h1 className="text-3xl">{lot.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge status={lot.status}>{lot.status}</Badge>
              <span className="text-sm text-muted-foreground">{lot.category}{lot.subcategory ? ` · ${lot.subcategory}` : ''}</span>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Starting bid</div>
              <div className="font-display text-3xl text-gold">${lot.starting_bid ?? 0}</div>
              <Button className="mt-3 w-full" onClick={() => navigate(user ? '/home' : '/register')}>
                {user ? 'Register to Bid' : 'Sign up to Bid'}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Online bidding coming soon</p>
            </div>

            {lot.description && <p className="mt-4 text-sm text-muted-foreground">{lot.description}</p>}

            <div className="mt-6">
              <h2 className="mb-2 text-lg">Specifications</h2>
              <Spec label="Make" value={lot.make} />
              <Spec label="Model" value={lot.model} />
              <Spec label="Year" value={lot.year} />
              <Spec label="Serial Number" value={lot.serial_number} />
              <Spec label={lot.usage_unit === 'miles' ? 'Miles' : 'Hours'} value={lot.usage_value} />
              <Spec label="Horsepower" value={lot.horsepower} />
              <Spec label="Weight Rating (lbs)" value={lot.weight_rating_lbs} />
              <Spec label="Fuel Type" value={lot.fuel_type} />
              <Spec label="Condition" value={lot.condition} />
              <Spec label="Runs" value={lot.runs == null ? null : (lot.runs ? 'Yes' : 'No')} />
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
