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

export default function CompanyTeamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setTeam(await api.companyTeam(id)); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function add(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await api.addMember(id, email, role);
      setEmail(''); setRole('staff'); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function changeRole(membershipId, newRole) {
    setError('');
    try { await api.changeMemberRole(id, membershipId, newRole); await load(); }
    catch (e) { setError(e.message); }
  }

  async function remove(membershipId) {
    setError('');
    try { await api.removeMember(id, membershipId); await load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <AppShell>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/company')}>
        <ArrowLeft className="h-4 w-4" /> Back to portal
      </Button>
      <div className="mb-8">
        <h1 className="text-3xl">Team Management</h1>
        <p className="mt-1 text-muted-foreground">Add and manage your company's staff.</p>
      </div>

      {error && <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <Card className="mb-8">
        <CardHeader><CardTitle>Add Team Member</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1.5" style={{ minWidth: 220 }}>
              <Label>Registered user's email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </Select>
            </div>
            <Button disabled={busy}>{busy ? 'Adding…' : 'Add'}</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            The person must already have a StrataBid account. (Email invitations coming soon.)
          </p>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-2xl">Team ({team.length})</h2>
      <Card>
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-navy text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.membership_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{m.user?.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.user?.email}</td>
                  <td className="px-4 py-3">
                    {m.role === 'owner' ? (
                      <Badge>owner</Badge>
                    ) : (
                      <Select value={m.role} onChange={(e) => changeRole(m.membership_id, e.target.value)} className="h-8 w-32">
                        <option value="staff">staff</option>
                        <option value="manager">manager</option>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.role !== 'owner' && (
                      <Button size="sm" variant="destructive" onClick={() => remove(m.membership_id)}>Remove</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
