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
import { ArrowLeft, Upload, X, Search } from 'lucide-react';

const CATEGORIES = ['vehicle', 'trailer', 'equipment', 'attachment', 'other'];
const FUEL_TYPES = ['diesel', 'gas', 'kerosene', 'natural_gas', 'electric', 'other', 'none'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];
const MILES_CATEGORIES = ['vehicle', 'trailer'];

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openFlag, setOpenFlag] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [decoding, setDecoding] = useState(false);

  const empty = {
    title: '', category: 'equipment', subcategory: '', make: '', model: '', year: '',
    serial_number: '', vin: '', usage_value: '', horsepower: '',
    weight_rating_lbs: '', fuel_type: '', condition: '', runs: '', reserve_price: '', parent_listing_id: '',
  };
  const [form, setForm] = useState(empty);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const usageUnit = MILES_CATEGORIES.includes(form.category) ? 'miles' : 'hours';
  const usageLabel = usageUnit === 'miles' ? 'Miles' : 'Hours';

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

  async function decodeVin() {
    const vin = (form.vin || '').trim();
    if (vin.length < 11) { setError('Enter a full VIN to decode'); return; }
    setError(''); setDecoding(true);
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`);
      const data = await res.json();
      const r = data?.Results?.[0] || {};
      setForm((f) => {
        const make = r.Make ? toTitle(r.Make) : f.make;
        const model = r.Model || f.model;
        const year = r.ModelYear || f.year;
        // Auto-generate a title from year/make/model if the user hasn't typed one.
        const autoTitle = [year, make, model].filter(Boolean).join(' ');
        const gvwr = r.GVWR && r.GVWR !== 'Not Applicable' ? r.GVWR : f.weight_rating_lbs;
        return {
          ...f,
          make, model, year,
          fuel_type: mapFuel(r.FuelTypePrimary) || f.fuel_type,
          title: f.title && f.title.trim() ? f.title : autoTitle,
          weight_rating_lbs: gvwr,
        };
      });
      if (!r.Make && !r.Model) setError('No vehicle data found for that VIN');
    } catch {
      setError('VIN lookup failed — check your connection and try again');
    } finally { setDecoding(false); }
  }

  async function onPhotoPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 10) { setError('Maximum 10 photos'); return; }
    setError(''); setUploading(true);
    try {
      for (const f of files) {
        const res = await api.uploadImage(f);
        setPhotos((p) => [...p, res]);
      }
    } catch (e) { setError(e.message); } finally { setUploading(false); e.target.value = ''; }
  }
  function removePhoto(i) { setPhotos((p) => p.filter((_, idx) => idx !== i)); }

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const finalTitle = form.title && form.title.trim()
        ? form.title
        : [form.year, form.make, form.model].filter(Boolean).join(' ');
      await api.createListing({
        auction_id: id, title: finalTitle, category: form.category,
        subcategory: form.subcategory || undefined, make: form.make || undefined,
        model: form.model || undefined, year: form.year ? Number(form.year) : undefined,
        serial_number: form.serial_number || undefined, vin: form.vin || undefined,
        usage_value: form.usage_value ? Number(form.usage_value) : undefined,
        usage_unit: form.usage_value ? usageUnit : undefined,
        horsepower: form.horsepower ? Number(form.horsepower) : undefined,
        weight_rating_lbs: parseWeight(form.weight_rating_lbs),
        fuel_type: form.fuel_type || undefined, condition: form.condition || undefined,
        runs: form.runs === '' ? undefined : form.runs === 'yes',
        reserve_price: form.reserve_price ? Number(form.reserve_price) : undefined,
        photos: photos.map((p) => p.path),
        parent_listing_id: form.category === 'attachment' && form.parent_listing_id ? form.parent_listing_id : undefined,
      });
      setForm(empty); setPhotos([]); await load();
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
          <form onSubmit={submit} className="space-y-6">
            <div className="rounded-md border border-border p-3">
              <Label>VIN (optional — auto-fills make / model / year)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={form.vin} onChange={(e) => set('vin', e.target.value)} placeholder="17-character VIN" className="flex-1" />
                <Button type="button" variant="outline" onClick={decodeVin} disabled={decoding}>
                  <Search className="h-4 w-4" /> {decoding ? 'Decoding…' : 'Decode VIN'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {field('Title', <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Auto from year/make/model" />)}
              {field('Category', <Select value={form.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>)}
              {field('Subcategory', <Input value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="excavator" />)}
              {field('Make', <Input value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="Caterpillar" />)}
              {field('Model', <Input value={form.model} onChange={(e) => set('model', e.target.value)} />)}
              {field('Year', <Input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />)}
              {field('Serial Number', <Input value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} />)}
              {field(usageLabel, <Input type="number" value={form.usage_value} onChange={(e) => set('usage_value', e.target.value)} placeholder={usageLabel} />)}
              {field('Horsepower', <Input type="number" value={form.horsepower} onChange={(e) => set('horsepower', e.target.value)} />)}
              {field('Weight / GVWR', <Input value={form.weight_rating_lbs} onChange={(e) => set('weight_rating_lbs', e.target.value)} placeholder="lbs or GVWR class" />)}
              {field('Fuel type', <Select value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}><option value="">—</option>{FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}</Select>)}
              {field('Condition', <Select value={form.condition} onChange={(e) => set('condition', e.target.value)}><option value="">—</option>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select>)}
              {field('Runs?', <Select value={form.runs} onChange={(e) => set('runs', e.target.value)}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></Select>)}
              {field('Reserve price ($)', <Input type="number" value={form.reserve_price} onChange={(e) => set('reserve_price', e.target.value)} placeholder="Min seller will take" />)}
              {form.category === 'attachment' && field('Goes with', <Select value={form.parent_listing_id} onChange={(e) => set('parent_listing_id', e.target.value)}><option value="">—</option>{parentOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>)}
            </div>

            <div>
              <Label>Photos (up to 10)</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p.path} alt="" className="h-24 w-24 rounded-md object-cover border border-border" />
                    <button type="button" onClick={() => removePhoto(i)} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-md border border-dashed border-border text-muted-foreground hover:border-gold hover:text-gold">
                    <div className="flex flex-col items-center gap-1 text-xs">
                      <Upload className="h-5 w-5" />
                      {uploading ? 'Uploading…' : 'Add'}
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onPhotoPick} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            <Button disabled={busy || uploading}>{busy ? 'Adding…' : 'Add Item'}</Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-2xl">Items ({listings.length})</h2>
      {listings.length === 0 ? (
        <p className="text-muted-foreground">No items yet.</p>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-navy text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Item #</th>
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
                    <td className="px-4 py-3">{l.item_number ?? '—'}</td>
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

function toTitle(s) {
  return String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function mapFuel(nhtsa) {
  if (!nhtsa) return '';
  const v = nhtsa.toLowerCase();
  if (v.includes('diesel')) return 'diesel';
  if (v.includes('gas')) return 'gas';
  if (v.includes('electric')) return 'electric';
  if (v.includes('natural')) return 'natural_gas';
  return '';
}

function parseWeight(v) {
  if (v == null || v === '') return undefined;
  // Pull all numbers; if it's a range/class string, take the largest (the upper bound).
  const nums = String(v).replace(/,/g, '').match(/\d+/g);
  if (!nums) return undefined;
  const max = Math.max(...nums.map(Number));
  return Number.isFinite(max) ? max : undefined;
}
