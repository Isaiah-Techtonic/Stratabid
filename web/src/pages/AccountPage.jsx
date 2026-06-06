import { useState } from 'react';
import { useAuth } from '@/lib/auth.jsx';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AccountPage() {
  const { user } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePw(e) {
    e.preventDefault();
    setError(''); setMsg('');
    if (next !== confirm) { setError('New passwords do not match'); return; }
    setBusy(true);
    try {
      await api.changePassword(cur, next);
      setMsg('Password updated successfully.');
      setCur(''); setNext(''); setConfirm('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl">My Account</h1>
        <p className="mt-1 text-muted-foreground">Manage your StrataBid account.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {user?.full_name}</div>
            <div><span className="text-muted-foreground">Email:</span> {user?.email}</div>
            <div><span className="text-muted-foreground">Role:</span> {user?.role}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={changePw} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
              </div>
              {error && <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-red-300">{error}</div>}
              {msg && <div className="rounded-md border border-green-600 bg-green-600/10 px-3 py-2 text-sm text-green-300">{msg}</div>}
              <Button disabled={busy}>{busy ? 'Updating…' : 'Update Password'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
