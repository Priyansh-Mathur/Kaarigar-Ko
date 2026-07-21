import { useAuth } from '@/lib/auth';
import { Hammer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui';

export function SiteHeader() {
  const { user, loading } = useAuth();
  const dest = user?.role === 'OPS_ADMIN' || user?.role === 'SUPER_ADMIN' ? '/admin' : '/app';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 glass">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-glow">
            <Hammer className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Kaarigar<span className="text-brand-600">Go</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#services" className="transition hover:text-slate-900">Services</a>
          <a href="#how" className="transition hover:text-slate-900">How it works</a>
          <a href="#pro" className="transition hover:text-slate-900">Become a pro</a>
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <Link to={dest}><Button size="sm">Dashboard</Button></Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button size="sm" variant="ghost">Log in</Button>
              </Link>
              <Link to="/login"><Button size="sm">Book a pro</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
