import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Package, Plus, X } from 'lucide-react';

export default function LotComposerPage() {
  const { id } = useParams(); // auction id
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]); // item ids selected to place
  const [newLotTitle, setNewLotTitle] = useState('');
  const [newLotBid, setNewLotBid] = useState('');

  async function load() {
    try {
      const [l, u] = await Promise.all([api.lots(id), api.unassignedItems(id)]);
      setLots(l); setUnassigned(u);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  function toggle(itemId) {
    setSelected((s) => s.includes(itemId) ? s.filter((x) => x !== itemId) : [...s, itemId]);
  }

  async function createLot(withSelected) {
    setError('');
    try {
      await api.createLot({
        auction_id: id,
        title: newLotTitle || undefined,
        starting_bid: newLotBid ? Number(newLotBid) : 0,
        item_ids: withSelected ? selected : [],
      });
      setNewLotTitle(''); setNewLotBid(''); setSelected([]);
      await load();
    } catch (e) { setError(e.message); }
  }

  async function assignToLot(lotId) {
    if (!selected.length) { setError('Select items first'); return; }
    setError('');
    try { await api.assignItems(lotId, selected); setSelected([]); await load(); }
    catch (e) { setError(e.message); }
  }

  async function removeFromLot(lotId, itemId) {
    setError('');
    try { await api.removeItemFromLot(lotId, itemId); await load(); }
    catch (e) { setError(e.message); }
  }

  async function delLot(lotId) {
    setError('');
    try { await api.deleteLot(lotId); await load(); }
    catch (e) { setError(e.message); }
  }

  const itemThumb = (it) => (
    <div className="flex items-center gap-2">
      {it.photos?.[0]
        ? <img src={it.photos[0]} alt="" className="h-10 w-10 rounded object-cover border border-border" />
        : <span className="grid h-10 w-10 place-items-center rounded border border-border text-muted-foreground"><Package className="h-4 w-4" /></span>}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{it.title}</div>
        <div className="truncate text-xs text-muted-foreground">{[it.make, it.model].filter(Boolean).join(' ')}</div>
      </div>
    </div>
  );

  return (
    <AppShell>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(`/auctions/${id}`)}>
        <ArrowLeft className="h-4 w-4" /> Back to auction
      </Button>
      <div className="mb-8">
        <h1 className="text-3xl">Organize Lots</h1>
        <p className="mt-1 text-muted-foreground">Group approved items into lots. A lot is what bidders bid on — it can hold one item or many.</p>
      </div>

      {error && <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unassigned items */}
        <Card>
          <CardHeader><CardTitle>Approved Items ({unassigned.length})</CardTitle></CardHeader>
          <CardContent>
            {unassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unassigned approved items. Approve items in the Review Queue first.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {unassigned.map((it) => (
                    <label key={it.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 ${selected.includes(it.id) ? 'border-gold bg-gold/5' : 'border-border'}`}>
                      <input type="checkbox" checked={selected.includes(it.id)} onChange={() => toggle(it.id)} />
                      {itemThumb(it)}
                    </label>
                  ))}
                </div>
                <div className="mt-4 rounded-md border border-border p-3">
                  <Label>Create a lot from {selected.length} selected item{selected.length === 1 ? '' : 's'}</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input placeholder="Lot title (optional)" value={newLotTitle} onChange={(e) => setNewLotTitle(e.target.value)} className="h-9 flex-1" style={{ minWidth: 140 }} />
                    <Input placeholder="Start bid $" type="number" value={newLotBid} onChange={(e) => setNewLotBid(e.target.value)} className="h-9 w-28" />
                    <Button size="sm" disabled={!selected.length} onClick={() => createLot(true)}><Plus className="h-4 w-4" /> New Lot</Button>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => createLot(false)}>Or create an empty lot</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Existing lots */}
        <Card>
          <CardHeader><CardTitle>Lots ({lots.length})</CardTitle></CardHeader>
          <CardContent>
            {lots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lots yet. Select items on the left and create one.</p>
            ) : (
              <div className="space-y-3">
                {lots.map((lot) => (
                  <div key={lot.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        Lot {lot.lot_number}{lot.title ? ` — ${lot.title}` : ''}
                        <span className="ml-2 text-xs text-muted-foreground">${lot.starting_bid} start</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={!selected.length} onClick={() => assignToLot(lot.id)}>+ Add selected</Button>
                        <Button size="sm" variant="ghost" onClick={() => delLot(lot.id)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(lot.equipment_listings || []).map((it) => (
                        <div key={it.id} className="flex items-center justify-between rounded bg-navy/40 px-2 py-1">
                          {itemThumb(it)}
                          <button onClick={() => removeFromLot(lot.id, it.id)} className="text-muted-foreground hover:text-red-300"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                      {(lot.equipment_listings || []).length === 0 && <p className="text-xs text-muted-foreground">Empty lot — add items.</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
