import { Button, Card, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
import { api, Api } from '@/lib/api';
import { dateTime, rupees } from '@/lib/format';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminDisputes() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => Api.adminDisputes().then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);

  async function resolve(id, resolution) {
    setBusy(id);
    try {
      await api(`/admin/disputes/${id}/resolve`, { method: 'POST', body: { resolution }, auth: true });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Disputes</h1>
      <p className="text-sm text-slate-500">Resolve issues with refunds or credits.</p>

      <div className="mt-6 space-y-3">
        {!rows ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : rows.length === 0 ? (
          <EmptyState icon={<ShieldAlert className="h-10 w-10" />} title="No disputes" description="Nothing to resolve — nice and calm." />
        ) : (
          rows.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{d.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Booking #{d.booking?.id?.slice(0, 8)} · {rupees(d.booking?.finalPrice ?? d.booking?.priceEstimate)} · {dateTime(d.createdAt)}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              {d.status !== 'RESOLVED' && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => resolve(d.id, 'DISMISS')} disabled={busy === d.id}>Dismiss</Button>
                  <Button size="sm" loading={busy === d.id} onClick={() => resolve(d.id, 'REFUND_CUSTOMER')}>Refund customer</Button>
                </div>
              )}
              {d.resolutionNotes && <p className="mt-3 text-sm text-slate-500">Resolution: {d.resolutionNotes}</p>}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
