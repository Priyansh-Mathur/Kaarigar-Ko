import { Badge, Card, EmptyState, Skeleton, StatusBadge } from '@/components/ui';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { catMeta } from '@/lib/categories';
import { dateTime, rupees } from '@/lib/format';
import { ArrowRight, CalendarClock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function CustomerHome() {
  const { user } = useAuth();
  const [categories, setCategories] = useState(null);
  const [bookings, setBookings] = useState(null);

  useEffect(() => {
    Api.categories().then((r) => setCategories(r.data)).catch(() => setCategories([]));
    Api.myBookings().then((r) => setBookings(r.data)).catch(() => setBookings([]));
  }, []);

  return (
    <div className="space-y-10">
      {/* Greeting / hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white">
        <div className="hero-grid absolute inset-0 opacity-20" />
        <div className="relative">
          <p className="text-brand-200">Hi {user?.name?.split(' ')[0] ?? 'there'} 👋</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">What needs fixing today?</h1>
          <div className="mt-5 flex max-w-md items-center gap-2 rounded-xl bg-white p-1.5 shadow-soft">
            <Search className="ml-2 h-5 w-5 text-slate-400" />
            <input
              placeholder="Search a service…"
              className="h-9 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              disabled
            />
            <span className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold">Pick below ↓</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Browse services</h2>
        {!categories ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => {
              const meta = catMeta(c.slug);
              return (
                <Link
                  key={c.id}
                  to={`/app/book?categoryId=${c.id}&slug=${c.slug}`}
                  className="group card flex flex-col gap-3 p-5 transition hover:-translate-y-1 hover:shadow-card"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl transition group-hover:bg-brand-100">
                    {meta.emoji}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.services?.length ?? 0} services</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent bookings */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent bookings</h2>
          <Link to="/app/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {!bookings ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-10 w-10" />}
            title="No bookings yet"
            description="Pick a service above to book your first verified pro."
          />
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 4).map((b) => (
              <Link key={b.id} to={`/app/bookings/${b.id}`}>
                <Card className="flex items-center justify-between transition hover:shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">🛠️</span>
                    <div>
                      <p className="font-semibold text-slate-900">{b.service?.name ?? 'Service'}</p>
                      <p className="text-xs text-slate-400">{dateTime(b.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden font-semibold text-slate-700 sm:block">{rupees(b.finalPrice ?? b.priceEstimate)}</span>
                    <StatusBadge status={b.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {user?.role === 'WORKER' && (
        <Badge tone="amber">You&apos;re signed in as a pro — booking is for customers. Use the worker app to manage jobs.</Badge>
      )}
    </div>
  );
}
