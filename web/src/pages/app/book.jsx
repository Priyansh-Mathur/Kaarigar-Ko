import { Button, Card, Skeleton } from '@/components/ui';
import { Api } from '@/lib/api';
import { rupees } from '@/lib/format';
import { Banknote, Check, Clock, CreditCard, MapPin } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

const LOCATIONS = [
  { label: 'Jabalpur, MP', lat: 23.18, lng: 79.98 },
  { label: 'Civil Lines', lat: 23.166, lng: 79.95 },
];

export default function BookPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = params.get('categoryId') ?? undefined;

  const [services, setServices] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [loc, setLoc] = useState(LOCATIONS[0]);
  const [mode, setMode] = useState('ONLINE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Api.services(categoryId)
      .then((r) => {
        setServices(r.data);
        if (r.data[0]) setServiceId(r.data[0].id);
      })
      .catch(() => setServices([]));
  }, [categoryId]);

  const selected = services?.find((s) => s.id === serviceId);

  async function confirm() {
    if (!serviceId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await Api.createBooking({ serviceId, lat: loc.lat, lng: loc.lng, paymentMode: mode });
      navigate(`/app/bookings/${r.data.id}`);
    } catch (e) {
      setError(e.message ?? 'Could not create booking');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/app" className="text-sm text-slate-500 hover:text-slate-800">← Back to services</Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Book a service</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Service picker */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">1 · Choose a service</h2>
            {!services ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : (
              <div className="space-y-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                      serviceId === s.id ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" /> ~{s.defaultDurationMin} min
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">{rupees(s.basePrice)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Location */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">2 · Where?</h2>
            <div className="grid grid-cols-2 gap-3">
              {LOCATIONS.map((l) => (
                <button
                  key={l.label}
                  onClick={() => setLoc(l)}
                  className={`flex items-center gap-2 rounded-2xl border p-4 text-left transition ${
                    loc.label === l.label ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <MapPin className="h-5 w-5 text-brand-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{l.label}</p>
                    <p className="text-xs text-slate-400">{l.lat}, {l.lng}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">3 · Payment</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('ONLINE')}
                className={`flex items-center gap-2 rounded-2xl border p-4 transition ${mode === 'ONLINE' ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <CreditCard className="h-5 w-5 text-brand-500" />
                <span className="text-sm font-semibold text-slate-900">Pay online (UPI/Card)</span>
              </button>
              <button
                onClick={() => setMode('CASH')}
                className={`flex items-center gap-2 rounded-2xl border p-4 transition ${mode === 'CASH' ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <Banknote className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-semibold text-slate-900">Cash after service</span>
              </button>
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h3 className="font-bold text-slate-900">Summary</h3>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Service</span><span className="text-right font-medium text-slate-800">{selected?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-medium text-slate-800">{loc.label}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Payment</span><span className="font-medium text-slate-800">{mode === 'ONLINE' ? 'Online' : 'Cash'}</span></div>
              <div className="my-2 border-t border-dashed border-slate-200" />
              <div className="flex justify-between text-base"><span className="font-semibold text-slate-900">Estimate</span><span className="font-bold text-brand-700">{rupees(selected?.basePrice)}</span></div>
            </div>
            <p className="mt-3 text-xs text-slate-400">We&apos;ll match you with the nearest verified pro. Final price confirmed before settlement.</p>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <Button className="mt-4 w-full" loading={submitting} disabled={!serviceId} onClick={confirm}>
              <Check className="h-4 w-4" /> Confirm booking
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
