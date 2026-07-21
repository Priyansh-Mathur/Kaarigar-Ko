import { Card, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
import { Api } from '@/lib/api';
import { dateTime, rupees } from '@/lib/format';
import { ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';

const FILTERS = ['', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'SETTLED', 'DISPUTED'];

export default function AdminBookings() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setRows(null);
    Api.adminBookings(status || undefined).then((r) => setRows(r.data)).catch(() => setRows([]));
  }, [status]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Bookings monitor</h1>
      <p className="text-sm text-slate-500">Live feed of every booking on the platform.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f || 'all'}
            onClick={() => setStatus(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${status === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {f ? f.replace(/_/g, ' ').toLowerCase() : 'all'}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {!rows ? (
          <div className="space-y-px">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-none" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-10 w-10" />} title="No bookings" description="Nothing matches this filter yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Service</th>
                <th className="px-5 py-3 font-semibold">Pro</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">When</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => (
                <tr key={b.id} className="transition hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-800">{b.service?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{b.worker?.user?.name ?? <span className="text-slate-300">unassigned</span>}</td>
                  <td className="hidden px-5 py-3 text-slate-400 sm:table-cell">{dateTime(b.createdAt)}</td>
                  <td className="px-5 py-3 font-semibold text-slate-700">{rupees(b.finalPrice ?? b.priceEstimate)}</td>
                  <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
