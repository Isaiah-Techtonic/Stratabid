import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Upload, X } from 'lucide-react';

const CATEGORIES = ['vehicle', 'trailer', 'equipment', 'attachment', 'other'];
const FUEL_TYPES = ['diesel', 'gas', 'kerosene', 'natural_gas', 'electric', 'other', 'none'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

export default function SubmitEquipmentPage() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]); // array of { path }

  const empty = {
    auction_id: '', title: '', category: 'equipment', subcategory: '',
    make: '', model: '', year: '', serial_number: '', vin: '',
    usage_value: '', usage_unit: 'hours', horsepower: '', weight_rating_lbs: '',
    fuel_type: '', condition: '', runs: '', starting_bid: '', reserve_price: '',
  };
  const [form, setForm] = useState(empty);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  useEffect(() => {
    api.openAuctions()
      .then((rows) => { setAuctions(rows); if (rows.length) set('auction_id', rows[0].id); })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line
  }, []);

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
    e.preventDefault(); setError('');
    if (photos.length < 1) { setError('At least one photo is required'); return; }
    setBusy(true);
    try {
      await api.submitListing({
        auction_id: form.auction_id, title: form.title, category: form.category,
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
        reserve_price: form.reserve_price ? Number(form.reserve_price) : undefined,
        photos: photos.map((p) => p.path),
      });
      navigate('/my-listings', { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const field = (label, node) => <div className="space-y-1.5"><Label>{label}</Label>{node}</div>;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl">Submit Equipment</h1>
        <p className="mt-1 text-muted-foreground">List your equipment for an upcoming auction. The auction company reviews each submission.</p>
      </div>

      {error && <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {auctions.length === 0 ? (
        <Card><CardContent className="pt-6 text-muted-foreground">No auctions are currently accepting submissions. Check back soon.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Equipment Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {field('Auction *', <Select value={form.auction_id} onChange={(e) => set('auction_id', e.target.value)}>{auctions.map((a) => <option key={a.id} value={a.id}>{a.title} — {a.auction_companies?.name}</option>)}</Select>)}
                {field('Title *', <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />)}
                {field('Category', <Select value={form.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>)}
                {field('Make', <Input value={form.make} onChange={(e) => set('make', e.target.value)} />)}
                {field('Model', <Input value={form.model} onChange={(e) => set('model', e.target.value)} />)}
                {field('Year', <Input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} />)}
                {field('Serial Number', <Input value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} />)}
                {field('Hours/Miles', <Input type="number" value={form.usage_value} onChange={(e) => set('usage_value', e.target.value)} />)}
                {field('Unit', <Select value={form.usage_unit} onChange={(e) => set('usage_unit', e.target.value)}><option value="hours">hours</option><option value="miles">miles</option></Select>)}
                {field('Horsepower', <Input type="number" value={form.horsepower} onChange={(e) => set('horsepower', e.target.value)} />)}
                {field('Fuel', <Select value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}><option value="">—</option>{FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}</Select>)}
                {field('Condition', <Select value={form.condition} onChange={(e) => set('condition', e.target.value)}><option value="">—</option>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select>)}
                {field('Runs?', <Select value={form.runs} onChange={(e) => set('runs', e.target.value)}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></Select>)}
                {field('Suggested starting bid ($)', <Input type="number" value={form.starting_bid} onChange={(e) => set('starting_bid', e.target.value)} />)}
                {field('Suggested reserve ($)', <Input type="number" value={form.reserve_price} onChange={(e) => set('reserve_price', e.target.value)} />)}
              </div>

              <div>
                <Label>Photos * (1–10, max 10MB each)</Label>
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

              <Button disabled={busy || uploading}>{busy ? 'Submitting…' : 'Submit for Review'}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
