import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { catMeta } from '@/lib/categories';
import { BadgeCheck, MapPin, ShieldCheck, Sparkles, Star, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORIES = ['electrician', 'plumber', 'cleaner', 'carpenter', 'painter', 'ac-technician', 'pest-control', 'appliance-repair'];

const STEPS = [
  { icon: MapPin, title: 'Pick a service', text: 'Choose what you need and where. Upfront price estimates, no surprises.' },
  { icon: BadgeCheck, title: 'Get matched', text: 'We rank verified pros by distance, rating and reliability — not just nearest.' },
  { icon: Wallet, title: 'Pay securely', text: 'UPI, cards or cash. Funds release to the pro only after the job is done.' },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid absolute inset-0 -z-10" />
        <div className="absolute -top-24 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" /> Verified pros • Live tracking • Fair pricing
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Trusted local pros, <br />
              <span className="gradient-text">on demand.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-600">
              Electricians, plumbers, cleaners and more — background-verified, fairly priced, and tracked from request to done.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-600 px-7 font-semibold text-white shadow-glow transition hover:bg-brand-700 active:scale-[.98]"
              >
                Book a pro now
              </Link>
              <a
                href="#services"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-7 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Explore services
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> KYC-verified</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400" /> 4.8 avg rating</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4 text-brand-500" /> UPI & cash</span>
            </div>
          </div>

          {/* Hero card mock */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="card mx-auto max-w-sm p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Your booking</span>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">en route</span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">RE</div>
                <div>
                  <p className="font-semibold text-slate-900">Ravi Electrician</p>
                  <p className="text-sm text-slate-500">★ 4.7 · 120 jobs · 2.4 km away</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Switch & Socket Repair</span>
                  <span className="font-semibold text-slate-900">₹199</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Arriving in</span>
                  <span className="font-semibold text-emerald-600">~ 12 min</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {['Accepted', 'En route', 'Working'].map((s, i) => (
                  <div key={s} className={`rounded-lg py-2 font-medium ${i <= 1 ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-400'}`}>{s}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container-page py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">What do you need done?</h2>
          <p className="mt-2 text-slate-500">Pick a category — vetted pros are a tap away.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((slug) => {
            const meta = catMeta(slug);
            return (
              <Link
                key={slug}
                to="/login"
                className="group card flex flex-col items-start gap-3 p-5 transition hover:-translate-y-1 hover:shadow-card"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl transition group-hover:bg-brand-100">{meta.emoji}</span>
                <div>
                  <p className="font-semibold capitalize text-slate-900">{slug.replace(/-/g, ' ')}</p>
                  <p className="text-sm text-slate-500">{meta.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white py-16">
        <div className="container-page">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How KaarigarKo works</h2>
            <p className="mt-2 text-slate-500">From request to done in three simple steps.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-slate-100 bg-slate-50/60 p-6">
                <span className="absolute right-5 top-5 text-5xl font-black text-slate-100">{i + 1}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-page py-16">
        <div className="grid gap-6 rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-10 text-center text-white sm:grid-cols-3">
          {[
            { n: '50k+', l: 'Jobs completed' },
            { n: '4.8★', l: 'Average rating' },
            { n: '8 min', l: 'Avg arrival time' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-4xl font-extrabold">{s.n}</p>
              <p className="mt-1 text-brand-200">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Become a pro */}
      <section id="pro" className="container-page pb-20">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-10 text-center md:flex-row md:text-left">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Are you a skilled professional?</h2>
            <p className="mt-2 max-w-lg text-slate-500">
              Join KaarigarKo, get verified, and grow your business with steady local jobs, fair commissions, and on-time payouts.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-accent-500 px-7 font-semibold text-white shadow-soft transition hover:bg-accent-600"
          >
            Become a pro
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
