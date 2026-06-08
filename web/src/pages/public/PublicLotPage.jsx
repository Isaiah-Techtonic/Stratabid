import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth.jsx';
import PublicLayout from './PublicLayout.jsx';
import BidPanel from '@/components/BidPanel.jsx';
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

function ItemCard({ it }) {
  const [active, setActive] = useState(0);
  const photos = it.photos || [];
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-navy">
              {photos[active]
                ? <img src={photos[active]} alt="" className="h-full w-full object-contain" />
                : <div className="flex h-full items-center justify-center"><Package className="h-12 w-12 opacity-30 text-muted-foreground" /></div>}
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {photos.map((p, i) => (
                  <button key={i} onClick={() => setActive(i)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border ${i === active ? 'border-gold' : 'border-border'}`}>
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl">{it.title}</h3>
            <p className="text-sm text-muted-foreground">{it.category}{it.subcategory ? ` · ${it.subcategory}` : ''}</p>
            {it.description && <p className="mt-2 text-sm text-muted-foreground">{it.description}</p>}
            <div className="mt-4">
              <Spec label="Make" value={it.make} />
              <Spec label="Model" value={it.model} />
              <Spec label="Year" value={it.year} />
              <Spec label="Serial Number" value={it.serial_number} />
              <Spec label={it.usage_unit === 'miles' ? 'Miles' : 'Hours'} value={it.usage_value} />
              <Spec label="Horsepower" value={it.horsepower} />
              <Spec label="Weight Rating (lbs)" value={it.weight_rating_lbs} />
              <Spec label="Fuel Type" value={it.fuel_type} />
              <Spec label="Condition" value={it.condition} />
              <Spec label="Runs" value={it.runs == null ? null : (it.runs ? 'Yes' : 'No')} />
            </div>
            {/* Live, per-item bidding. */}
            <div className="mt-4">
              <BidPanel itemId={it.id} startingBid={it.current_bid} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicLotPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lot, setLot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.pubLotDetail(id).then(setLot).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <PublicLayout><div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">{error}</div></PublicLayout>;
  if (!lot) return <PublicLayout><div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Loading…</div></PublicLayout>;

  const items = lot.equipment_listings || [];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {lot.auctions && (
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(`/a/${lot.auctions.id}`)}>
            <ArrowLeft className="h-4 w-4" /> Back to {lot.auctions.title}
          </Button>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm uppercase tracking-wide text-muted-foreground">
              Lot {lot.lot_number}{lot.item_count > 1 ? ` · ${lot.item_count} items` : ''}
            </span>
            <h1 className="text-3xl">{lot.display_title}</h1>
            {lot.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{lot.description}</p>}
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="text-sm text-muted-foreground">{items.length > 1 ? 'Items in this lot' : 'Bidding'}</div>
            <div className="font-display text-3xl text-gold">{items.length}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              {user ? 'Place live bids on each item below.' : 'Sign in to bid on each item below.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {items.length === 0 ? (
            <Card><CardContent className="pt-6 text-muted-foreground">No item details available.</CardContent></Card>
          ) : (
            items.map((it) => <ItemCard key={it.id} it={it} />)
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
