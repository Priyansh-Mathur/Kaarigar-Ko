import { Card, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
import { Api } from '@/lib/api';
import { dateTime, rupees } from '@/lib/format';
import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Completed' },
];
const ACTIVE = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'];
const DONE = ['COMPLETED', 'SETTLED'];

export default function BookingsList() {
  const [bookings, setBookings] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    Api.myBookings().then((r) => setBookings(r.data)).catch(() => setBookings([]));
  }, []);

  const filtered = useMemo(() => {
    if (!bookings) return null;
    if (tab === 'active') return bookings.filter((b) => ACTIVE.includes(b.status));
    if (tab === 'done') return bookings.filter((b) => DONE.includes(b.status));
    return bookings;
  }, [bookings, tab]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Your bookings</h1>

      <div className="mt-5 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {!filtered ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-10 w-10" />}
            title="Nothing here yet"
            description="When you book a service, it'll show up here."
            action={<Link to="/app" className="font-semibold text-brand-600">Browse services →</Link>}
          />
        ) : (
          filtered.map((b) => (
            <Link key={b.id} to={`/app/bookings/${b.id}`}>
              <Card className="flex items-center justify-between transition hover:shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">🛠️</span>
                  <div>
                    <p className="font-semibold text-slate-900">{b.service?.name ?? 'Service'}</p>
                    <p className="text-xs text-slate-400">{dateTime(b.createdAt)} · {b.paymentMode === 'CASH' ? 'Cash' : 'Online'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden font-semibold text-slate-700 sm:block">{rupees(b.finalPrice ?? b.priceEstimate)}</span>
                  <StatusBadge status={b.status} />
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
