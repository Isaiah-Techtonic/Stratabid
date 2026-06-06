import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

const CATEGORIES = ['vehicle', 'trailer', 'equipment', 'attachment', 'other'];
const FUEL_TYPES = ['diesel', 'gas', 'kerosene', 'natural_gas', 'electric', 'other', 'none'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openFlag, setOpenFlag] = useState(false);

  const empty = {
    title: '', category: 'equipment', subcategory: '', make: '', model: '', year: '',
    serial_number: '', vin: '', usage_value: '', usage_unit: 'hours', horsepower: '',
    weight_rating_lbs: '', fuel_type: '', condition: '', runs: '', starting_bid: '', parent_listing_id: '',
  };
  const [form, setForm] = useState(empty);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function load() {
    try {
      setListings(await api.listings(id));
      const all = await api.auctions();
      const a = all.find((x) => x.id === id);
      if (a) setOpenFlag(!!a.open_for_submissions);
    } catch (e) { setError(e.message); }
  }

  async function toggleOpen() {
    setError('');
    try { const r = await api.setAuctionOpen(id, !openFlag); setOpenFlag(r.open_for_submissions); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await api.createListing({
        auction_id: id, title: form.title, category: form.category,
        subcategory: form.subcategory || undefined, make: form.make || undefined,
        model: form.model || undefined, year: form.year ? Number(form.year) : undefined,
        serial_number: form.serial_number || undefined, vin: form.vin || undefined,
        usage_value: form.usage_value ? Number(form.usage_value) : undefined,
        usage_unit: form.usage_value ? form.usage_unit : undefined,
        horsepower: form.horsepower ? Number(form.horsepower) : undefined,
        weight_rating_lbs: form.weight_rating_lbs ? Number(form.weight_rating_lbs) : undefined,
        fuel_type: form.fuel_type || undefined, condition: form.condition || undefined,
        runs: form.runs === '' ? undefined : form.runs === 'yes',
        starting_bid: form.starting_bid ? Number(form.starting_bid) : 0,
        parent_listing_id: form.category === 'attachment' && form.parent_listing_id ? form.parent_listing_id : undefined,
      });
      setForm(empty); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function setStatus(lid, status) {
    setError('');
    try { await api.setListingStatus(lid, status); await load(); } catch (e) { setError(e.message); }
  }

  const parentOptions = listings.filter((l) => l.category !== 'attachment');
  const field = (label, node) => <div className="space-y-1.5"><Label>{label}</Label>{node}</div>;

  return (
    <AppShell>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/admin')}>
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Button>
      <div className="mb-8">
        <h1 className="text-3xl">Auction Items</h1>
        <p className="mt-1 text-muted-foreground">Add and review equipment items, then organize them into lots.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(`/auctions/${id}/review`)}>Review Queue</Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/auctions/${id}/lots`)}>Organize Lots</Button>
        <Button variant={openFlag ? 'default' : 'outline'} size="sm" onClick={toggleOpen}>
          {openFlag ? 'Open for submissions ✓' : 'Open for submissions'}
        </Button>
      </div>

      {error && <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <Card className="mb-10">
        <CardHeader><CardTitle>Add Equipment Item</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {field('Title *', <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />)}
              {field('Category', <Select value={form.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>)}
              {field('Subcategory', <Input value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="excavator" />)}
              {field('Make', <Input value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="Caterpillar" />)}
              {field('Model', <Input value={form.model} onChange={(e) => set('model', e.target.value)} />)}
              {field('Year', <Input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />)}
              {field('Serial Number', <Input value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} />)}
              {field('VIN', <Input value={form.vin} onChange={(e) => set('vin', e.target.value)} />)}
              {field('Usage', <Input type="number" value={form.usage_value} onChange={(e) => set('usage_value', e.target.value)} />)}
              {field('Usage unit', <Select value={form.usage_unit} onChange={(e) => set('usage_unit', e.target.value)}><option value="hours">hours</option><option value="miles">miles</option></Select>)}
              {field('Horsepower', <Input type="number" value={form.horsepower} onChange={(e) => set('horsepower', e.target.value)} />)}
              {field('Weight (lbs)', <Input type="number" value={form.weight_rating_lbs} onChange={(e) => set('weight_rating_lbs', e.target.value)} />)}
              {field('Fuel type', <Select value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}><option value="">—</option>{FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}</Select>)}
              {field('Condition', <Select value={form.condition} onChange={(e) => set('condition', e.target.value)}><option value="">—</option>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select>)}
              {field('Runs?', <Select value={form.runs} onChange={(e) => set('runs', e.target.value)}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></Select>)}
              {field('Starting bid ($)', <Input type="number" value={form.starting_bid} onChange={(e) => set('starting_bid', e.target.value)} />)}
              {form.category === 'attachment' && field('Goes with', <Select value={form.parent_listing_id} onChange={(e) => set('parent_listing_id', e.target.value)}><option value="">—</option>{parentOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>)}
            </div>
            <Button className="mt-6" disabled={busy}>{busy ? 'Adding…' : 'Add Item'}</Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-2xl">Items ({listings.length})</h2>
      {listings.length === 0 ? (
        <p className="text-muted-foreground">No lots yet.</p>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-navy text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Lot</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Make / Model</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{l.lot_number ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{[l.make, l.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.category}{l.subcategory ? ` / ${l.subcategory}` : ''}</td>
                    <td className="px-4 py-3"><Badge status={l.status}>{l.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {l.status === 'submitted' && (
                        <span className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setStatus(l.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => setStatus(l.id, 'rejected')}>Reject</Button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
