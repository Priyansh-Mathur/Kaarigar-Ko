import { AppShell } from '@/components/app-shell';
import { CalendarClock, Home, Wallet } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export default function CustomerLayout() {
  return (
    <AppShell
      requireRole="user"
      navItems={[
        { href: '/app', label: 'Home', icon: Home },
        { href: '/app/bookings', label: 'Bookings', icon: CalendarClock },
        { href: '/app/wallet', label: 'Wallet', icon: Wallet },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
