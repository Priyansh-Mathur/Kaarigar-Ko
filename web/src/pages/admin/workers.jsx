import { Avatar, Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { api, Api } from '@/lib/api';
import { Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminWorkers() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => Api.adminWorkers().then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);

  async function toggleFeature(id, current) {
    setBusy(id);
    try {
      await api(`/admin/workers/${id}/feature`, { method: 'POST', body: { isFeatured: !current }, auth: true });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Workers</h1>
      <p className="text-sm text-slate-500">Manage your professional network.</p>

      <div className="mt-6 space-y-3">
        {!rows ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : rows.length === 0 ? (
          <EmptyState icon={<Users className="h-10 w-10" />} title="No workers yet" />
        ) : (
          rows.map((w) => (
            <Card key={w.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={w.user?.name} size={44} />
                <div>
                  <p className="font-semibold text-slate-900">
                    {w.user?.name} {w.isFeatured && <Badge tone="amber">Featured</Badge>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {w.user?.phone} · ★ {Number(w.ratingAvg).toFixed(1)} · {w.completedJobs} jobs · reliability {Math.round(w.reliabilityScore)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={w.kycStatus === 'APPROVED' ? 'green' : 'amber'}>{w.kycStatus.toLowerCase()}</Badge>
                <Badge tone={w.availabilityStatus === 'ONLINE' ? 'green' : 'slate'}>{w.availabilityStatus.toLowerCase()}</Badge>
                <Button size="sm" variant="secondary" loading={busy === w.id} onClick={() => toggleFeature(w.id, w.isFeatured)}>
                  <Star className="h-3.5 w-3.5" /> {w.isFeatured ? 'Unfeature' : 'Feature'}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
