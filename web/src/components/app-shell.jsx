import { useAuth } from '@/lib/auth';
import { Hammer, LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Spinner } from './ui';

export function AppShell({ navItems, requireRole, children }) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    const isAdmin = user.role === 'OPS_ADMIN' || user.role === 'SUPER_ADMIN';
    if (requireRole === 'admin' && !isAdmin) navigate('/app', { replace: true });
    if (requireRole === 'user' && isAdmin) navigate('/admin', { replace: true });
  }, [user, loading, requireRole, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  const isActive = (href, root) => pathname === href || (href !== root && pathname.startsWith(href));
  const root = requireRole === 'admin' ? '/admin' : '/app';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Hammer className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900">
              Kaarigar<span className="text-brand-600">Go</span>
            </span>
            {requireRole === 'admin' && (
              <span className="ml-1 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Admin
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((n) => (
              <Link
                key={n.href}
                to={n.href}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  isActive(n.href, root) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-800">{user.name ?? 'Guest'}</p>
              <p className="text-xs text-slate-400">{user.phone}</p>
            </div>
            <Avatar name={user.name} size={36} />
            <button
              onClick={() => {
                logout();
                navigate('/', { replace: true });
              }}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden">
          {navItems.map((n) => (
            <Link
              key={n.href}
              to={n.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive(n.href, root) ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="container-page py-8">{children}</main>
    </div>
  );
}
