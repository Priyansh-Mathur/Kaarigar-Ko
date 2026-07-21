import { Hammer } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Hammer className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900">KaarigarKo</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            Trusted local professionals, on demand. Fast, fair and reliable.
          </p>
        </div>
        {[
          { h: 'Services', items: ['Electrician', 'Plumber', 'Cleaning', 'AC Repair'] },
          { h: 'Company', items: ['About', 'Careers', 'Become a pro', 'Contact'] },
          { h: 'Legal', items: ['Privacy', 'Terms', 'Refund policy', 'Safety'] },
        ].map((col) => (
          <div key={col.h}>
            <p className="text-sm font-semibold text-slate-900">{col.h}</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              {col.items.map((i) => (
                <li key={i}>
                  <a href="#" className="transition hover:text-brand-600">{i}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} KaarigarKo. Built for Bharat.</span>
          <span>Made with care in Jabalpur 🧡</span>
        </div>
      </div>
    </footer>
  );
}
