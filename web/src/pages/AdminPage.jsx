import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Gavel, Radio, FileText, ChevronRight } from 'lucide-react';

function Stat({ icon: Icon, value, label }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-gold/15 text-gold">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <div className="font-display text-3xl leading-none text-gold">{value}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [error, setError] = useState('');

  const [coName, setCoName] = useState('');
  const [coEmail, setCoEmail] = useState('');
  const [coBusy, setCoBusy] = useState(false);

  const [aTitle, setATitle] = useState('');
  const [aCompany, setACompany] = useState('');
  const [aFormat, setAFormat] = useState('timed');
  const [aStarts, setAStarts] = useState('');
  const [aEnds, setAEnds] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aCity, setACity] = useState('');
  const [aState, setAState] = useState('');
  const [aBusy, setABusy] = useState(false);
  const [ownerEmails, setOwnerEmails] = useState({});
  const [assignMsg, setAssignMsg] = useState('');

  async function loadAll() {
    try {
      const [co, au] = await Promise.all([api.companies(), api.auctions()]);
      setCompanies(co);
      setAuctions(au);
      if (co.length && !aCompany) setACompany(co[0].id);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  async function createCompany(e) {
    e.preventDefault(); setError(''); setCoBusy(true);
    try {
      await api.createCompany({ name: coName, owner_email: coEmail });
      setCoName(''); setCoEmail(''); await loadAll();
    } catch (e) { setError(e.message); } finally { setCoBusy(false); }
  }

  async function createAuction(e) {
    e.preventDefault(); setError(''); setABusy(true);
    try {
      await api.createAuction({
        company_id: aCompany, title: aTitle, format: aFormat,
        description: aDesc || undefined, starts_at: aStarts || undefined,
        ends_at: aEnds || undefined, location_city: aCity || undefined, location_state: aState || undefined,
      });
      setATitle(''); setADesc(''); setAStarts(''); setAEnds(''); setACity(''); setAState('');
      await loadAll();
    } catch (e) { setError(e.message); } finally { setABusy(false); }
  }

  async function assignOwner(companyId) {
    setError(''); setAssignMsg('');
    const email = (ownerEmails[companyId] || '').trim();
    if (!email) { setError('Enter an email to assign as owner'); return; }
    try {
      await api.assignOwner(companyId, email);
      setAssignMsg('Owner assigned successfully.');
      setOwnerEmails((m) => ({ ...m, [companyId]: '' }));
    } catch (e) { setError(e.message); }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl">Platform Overview</h1>
        <p className="mt-1 text-muted-foreground">Techtonic master administration — full platform visibility.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Gavel} value={auctions.length} label="Total Auctions" />
        <Stat icon={Building2} value={companies.length} label="Auction Companies" />
        <Stat icon={Radio} value={auctions.filter((a) => a.status === 'live').length} label="Live Now" />
        <Stat icon={FileText} value={auctions.filter((a) => a.status === 'draft').length} label="Drafts" />
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>New Auction Company</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createCompany} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input value={coName} onChange={(e) => setCoName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Owner email</Label>
                <Input type="email" value={coEmail} onChange={(e) => setCoEmail(e.target.value)} required />
              </div>
              <Button className="w-full" disabled={coBusy}>{coBusy ? 'Creating…' : 'Create Company'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>New Auction</CardTitle></CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-muted-foreground">Create a company first.</p>
            ) : (
              <form onSubmit={createAuction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={aTitle} onChange={(e) => setATitle(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Select value={aCompany} onChange={(e) => setACompany(e.target.value)}>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Format</Label>
                    <Select value={aFormat} onChange={(e) => setAFormat(e.target.value)}>
                      <option value="timed">Timed</option>
                      <option value="live_webcast">Live webcast (soon)</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea
                    value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={2}
                    className="flex w-full rounded-md border border-input bg-navy-deep px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Starts at</Label>
                    <Input type="datetime-local" value={aStarts} onChange={(e) => setAStarts(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ends at</Label>
                    <Input type="datetime-local" value={aEnds} onChange={(e) => setAEnds(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Location city</Label>
                    <Input value={aCity} onChange={(e) => setACity(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Input value={aState} onChange={(e) => setAState(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full" disabled={aBusy}>{aBusy ? 'Creating…' : 'Create Auction'}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-2xl">Companies</h2>
      {assignMsg && <div className="mb-4 rounded-md border border-green-600 bg-green-600/10 px-4 py-2 text-sm text-green-300">{assignMsg}</div>}
      {companies.length === 0 ? (
        <p className="mb-10 text-muted-foreground">No companies yet.</p>
      ) : (
        <Card className="mb-10">
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-navy text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Assign Owner (registered email)</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="email"
                        placeholder="owner@example.com"
                        value={ownerEmails[c.id] || ''}
                        onChange={(e) => setOwnerEmails((m) => ({ ...m, [c.id]: e.target.value }))}
                        className="h-9 max-w-xs"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => assignOwner(c.id)}>Assign Owner</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h2 className="mb-4 text-2xl">Auctions</h2>
      {auctions.length === 0 ? (
        <p className="text-muted-foreground">No auctions yet.</p>
      ) : (
        <Card>
          <div className="overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-navy text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Format</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {auctions.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/auctions/${a.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-navy"
                  >
                    <td className="px-4 py-3 font-medium">{a.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.auction_companies?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.format}</td>
                    <td className="px-4 py-3"><Badge status={a.status}>{a.status}</Badge></td>
                    <td className="px-4 py-3 text-right"><ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></td>
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
