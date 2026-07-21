import { Card, Skeleton, StatusBadge } from '@/components/ui';
import { Api } from '@/lib/api';
import { rupees } from '@/lib/format';
import { Banknote, IndianRupee, ScrollText, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

function Stat({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

export default function AdminOverview() {
  const [o, setO] = useState(null);

  useEffect(() => {
    Api.adminOverview().then((r) => setO(r.data)).catch(() => setO(null));
  }, []);

  if (!o) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const statusEntries = Object.entries(o.statusCounts ?? {});
  const maxCount = Math.max(1, ...statusEntries.map(([, n]) => n));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Operations overview</h1>
        <p className="text-sm text-slate-500">Live snapshot of the marketplace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={IndianRupee} label="GMV (settled)" value={rupees(o.gmv)} tone="brand" />
        <Stat icon={TrendingUp} label="Revenue (commission)" value={rupees(o.revenue)} tone="green" />
        <Stat icon={ScrollText} label="Total bookings" value={String(o.bookingsTotal)} sub={`${o.settledBookings} settled`} tone="brand" />
        <Stat icon={ShieldAlert} label="Open disputes" value={String(o.disputes.open)} sub={`${(o.disputes.rate * 100).toFixed(1)}% dispute rate`} tone="rose" />
        <Stat icon={Users} label="Workers online" value={`${o.workers.online}`} sub={`of ${o.workers.total} total`} tone="green" />
        <Stat icon={Users} label="Customers" value={String(o.customers)} tone="brand" />
        <Stat icon={Banknote} label="Settled bookings" value={String(o.settledBookings)} tone="green" />
        <Stat icon={ShieldAlert} label="Total disputes" value={String(o.disputes.total)} tone="amber" />
      </div>

      <Card>
        <h2 className="mb-4 font-bold text-slate-900">Bookings by status</h2>
        {statusEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {statusEntries.map(([status, n]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-40 shrink-0"><StatusBadge status={status} /></div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${(n / maxCount) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-slate-700">{n}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
