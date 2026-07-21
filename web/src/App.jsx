import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/landing';
import LoginPage from './pages/login';
import CustomerLayout from './pages/app/layout';
import CustomerHome from './pages/app/home';
import BookPage from './pages/app/book';
import BookingsList from './pages/app/bookings';
import BookingDetail from './pages/app/booking-detail';
import WalletPage from './pages/app/wallet';
import AdminLayout from './pages/admin/layout';
import AdminOverview from './pages/admin/overview';
import AdminBookings from './pages/admin/bookings';
import AdminKyc from './pages/admin/kyc';
import AdminDisputes from './pages/admin/disputes';
import AdminWorkers from './pages/admin/workers';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Customer app */}
        <Route element={<CustomerLayout />}>
          <Route path="/app" element={<CustomerHome />} />
          <Route path="/app/book" element={<BookPage />} />
          <Route path="/app/bookings" element={<BookingsList />} />
          <Route path="/app/bookings/:id" element={<BookingDetail />} />
          <Route path="/app/wallet" element={<WalletPage />} />
        </Route>

        {/* Admin console */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/kyc" element={<AdminKyc />} />
          <Route path="/admin/disputes" element={<AdminDisputes />} />
          <Route path="/admin/workers" element={<AdminWorkers />} />
        </Route>

        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}
