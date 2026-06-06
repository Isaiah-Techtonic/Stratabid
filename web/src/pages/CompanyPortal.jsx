import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, ChevronRight } from 'lucide-react';

export default function CompanyPortal() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myCompanies()
      .then((rows) => setCompanies(rows.filter((r) => r.role !== 'master_admin')))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl">Company Portal</h1>
        <p className="mt-1 text-muted-foreground">Manage the auction companies you belong to.</p>
      </div>

      {error && <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : companies.length === 0 ? (
        <Card><CardContent className="pt-6 text-muted-foreground">
          You're not a member of any auction company yet. A company owner can add you to their team.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {companies.map(({ company, role }) => (
            <Card key={company.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-gold/15 text-gold"><Building2 className="h-6 w-6" /></span>
                  <div>
                    <h3 className="text-lg">{company.name}</h3>
                    <Badge>{role}</Badge>
                  </div>
                </div>
                {(role === 'owner' || role === 'manager') && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/company/${company.id}/team`)}>
                    <Users className="h-4 w-4" /> Team <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
