import React from 'react';
import AdminLogin from './components/AdminLogin';
import AdminLayout, { type AdminPage } from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import TourManagement from './components/TourManagement';
import BookingManagement from './components/BookingManagement';
import UserManagement from './components/UserManagement';
import { api } from '../api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePolledResource } from '../hooks/usePolledResource';
import type { BookingStatus, Tour } from '../types';

function App() {
  const [adminEmail, setAdminEmail] = useLocalStorage<string>('goready_admin_email', '');
  const [page, setPage] = React.useState<AdminPage>('dashboard');

  const { data: toursData, refresh: refreshTours } = usePolledResource(api.getTours);
  const { data: bookingsData, refresh: refreshBookings } = usePolledResource(api.getBookings);
  const { data: usersData, refresh: refreshUsers } = usePolledResource(api.getUsers);
  const tours = toursData ?? [];
  const bookings = bookingsData ?? [];
  const users = usersData ?? [];

  const adminUser = adminEmail ? users.find((u) => u.email.toLowerCase() === adminEmail.toLowerCase()) ?? null : null;

  // If the signed-in account loses admin rights or gets locked (picked up on the next poll), sign them out.
  React.useEffect(() => {
    if (!adminEmail || usersData === null) return; // not logged in, or account list hasn't loaded yet
    if (!adminUser || adminUser.role !== 'admin' || adminUser.status === 'locked') {
      setAdminEmail('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser, adminEmail, usersData]);

  const handleAdminLogin = async (email: string, password: string) => {
    const account = await api.login(email, password);
    if (account.role !== 'admin') {
      throw new Error('not_admin');
    }
    setAdminEmail(account.email);
  };

  if (!adminEmail) {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  // Logged in but the shared account list hasn't loaded/re-validated yet — avoid flashing the login form.
  if (!adminUser) {
    return <div className="grid min-h-screen place-items-center bg-surface text-sm text-slate-400">Đang tải...</div>;
  }

  const handleAddTour = async (tour: Tour) => {
    await api.createTour(tour);
    refreshTours();
  };
  const handleUpdateTour = async (tour: Tour) => {
    await api.updateTour(tour.id, tour);
    refreshTours();
  };
  const handleDeleteTour = async (tourId: string) => {
    await api.deleteTour(tourId);
    refreshTours();
  };
  const handleToggleHidden = async (tourId: string) => {
    await api.toggleTourHidden(tourId);
    refreshTours();
  };

  const handleChangeBookingStatus = async (bookingId: string, status: BookingStatus) => {
    await api.updateBookingStatus(bookingId, status);
    refreshBookings();
  };

  const handleToggleUserStatus = async (userId: string) => {
    await api.toggleUserStatus(userId);
    refreshUsers();
  };

  return (
    <AdminLayout page={page} onNavigate={setPage} adminName={adminUser.name} onLogout={() => setAdminEmail('')}>
      {page === 'dashboard' && <Dashboard tours={tours} bookings={bookings} users={users} />}
      {page === 'tours' && (
        <TourManagement tours={tours} onAdd={handleAddTour} onUpdate={handleUpdateTour} onDelete={handleDeleteTour} onToggleHidden={handleToggleHidden} />
      )}
      {page === 'bookings' && <BookingManagement bookings={bookings} tours={tours} onChangeStatus={handleChangeBookingStatus} />}
      {page === 'users' && <UserManagement users={users} onToggleStatus={handleToggleUserStatus} />}
    </AdminLayout>
  );
}

export default App;
