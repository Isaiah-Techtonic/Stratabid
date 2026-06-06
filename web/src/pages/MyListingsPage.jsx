import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.mySubmissions().then(setListings).catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl">My Listings</h1>
          <p className="mt-1 text-muted-foreground">Equipment you've submitted to auctions.</p>
        </div>
        <Button onClick={() => navigate('/submit')}><Plus className="h-4 w-4" /> Submit Equipment</Button>
      </div>

      {error && <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {listings.length === 0 ? (
        <p className="text-muted-foreground">You haven't submitted any equipment yet.</p>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-navy text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Auction</th>
                  <th className="px-4 py-3 font-medium">Suggested Bid</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.auctions?.title || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.starting_bid ? `$${l.starting_bid}` : '—'}</td>
                    <td className="px-4 py-3"><Badge status={l.status}>{l.status}</Badge></td>
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
