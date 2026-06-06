import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

export default function ReviewQueuePage() {
  const { id } = useParams(); // auction id
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState('');
  const [edits, setEdits] = useState({}); // listingId -> { starting_bid, reserve_price }

  async function load() {
    try { setQueue(await api.reviewQueue(id)); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  function setEdit(lid, k, v) {
    setEdits((m) => ({ ...m, [lid]: { ...(m[lid] || {}), [k]: v } }));
  }

  async function decide(lid, decision) {
    setError('');
    try {
      const e = edits[lid] || {};
      const payload = { decision };
      if (decision === 'approved') {
        if (e.starting_bid) payload.starting_bid = Number(e.starting_bid);
        if (e.reserve_price) payload.reserve_price = Number(e.reserve_price);
      }
      await api.reviewListing(lid, payload);
      await load();
    } catch (e) { setError(e.message); }
  }

  return (
    <AppShell>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(`/auctions/${id}`)}>
        <ArrowLeft className="h-4 w-4" /> Back to auction
      </Button>
      <div className="mb-8">
        <h1 className="text-3xl">Review Queue</h1>
        <p className="mt-1 text-muted-foreground">Submitted equipment awaiting your approval.</p>
      </div>

      {error && <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {queue.length === 0 ? (
        <p className="text-muted-foreground">Nothing awaiting review.</p>
      ) : (
        <div className="space-y-4">
          {queue.map((l) => (
            <Card key={l.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex gap-2">
                    {(l.photos || []).slice(0, 3).map((p, i) => (
                      <img key={i} src={p} alt="" className="h-24 w-24 rounded-md object-cover border border-border" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg">{l.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[l.make, l.model, l.year].filter(Boolean).join(' ')} · {l.category}
                      {l.serial_number ? ` · SN ${l.serial_number}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Submitted by {l.users?.full_name} ({l.users?.email})
                    </p>
                    <p className="mt-1 text-sm">Suggested starting bid: <span className="text-gold">${l.starting_bid ?? 0}</span>
                      {l.reserve_price ? <> · reserve ${l.reserve_price}</> : null}</p>
                  </div>
                  <div className="flex flex-col gap-2" style={{ minWidth: 200 }}>
                    <div className="flex gap-2">
                      <div className="space-y-1"><Label>Start bid</Label><Input className="h-9" type="number" placeholder={l.starting_bid} value={edits[l.id]?.starting_bid || ''} onChange={(e) => setEdit(l.id, 'starting_bid', e.target.value)} /></div>
                      <div className="space-y-1"><Label>Reserve</Label><Input className="h-9" type="number" placeholder={l.reserve_price || ''} value={edits[l.id]?.reserve_price || ''} onChange={(e) => setEdit(l.id, 'reserve_price', e.target.value)} /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => decide(l.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => decide(l.id, 'rejected')}>Reject</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
