import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth.jsx';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gavel, Package, User } from 'lucide-react';

export default function CustomerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl">Welcome, {user?.full_name?.split(' ')[0] || 'there'}</h1>
        <p className="mt-1 text-muted-foreground">Your StrataBid account is ready.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-gold/15 text-gold"><Gavel className="h-6 w-6" /></span>
            <div>
              <h3 className="text-lg">Browse Auctions</h3>
              <p className="text-sm text-muted-foreground">See upcoming and live equipment auctions.</p>
            </div>
            <Button variant="outline" size="sm" disabled>Coming soon</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-gold/15 text-gold"><Package className="h-6 w-6" /></span>
            <div>
              <h3 className="text-lg">Sell Equipment</h3>
              <p className="text-sm text-muted-foreground">Submit your equipment to an auction.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/submit')}>Submit</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-gold/15 text-gold"><Package className="h-6 w-6" /></span>
            <div>
              <h3 className="text-lg">My Listings</h3>
              <p className="text-sm text-muted-foreground">Track your submitted equipment.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/my-listings')}>View</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-gold/15 text-gold"><User className="h-6 w-6" /></span>
            <div>
              <h3 className="text-lg">My Account</h3>
              <p className="text-sm text-muted-foreground">Update your profile and password.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/account')}>Manage</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
