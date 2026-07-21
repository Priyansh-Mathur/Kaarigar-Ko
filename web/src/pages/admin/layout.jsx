import { AppShell } from '@/components/app-shell';
import { BadgeCheck, LayoutDashboard, ScrollText, ShieldAlert, Users } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <AppShell
      requireRole="admin"
      navItems={[
        { href: '/admin', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/bookings', label: 'Bookings', icon: ScrollText },
        { href: '/admin/kyc', label: 'KYC queue', icon: BadgeCheck },
        { href: '/admin/disputes', label: 'Disputes', icon: ShieldAlert },
        { href: '/admin/workers', label: 'Workers', icon: Users },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
