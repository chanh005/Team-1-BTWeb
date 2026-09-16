import React from 'react';
import AdminLogin from './components/AdminLogin';
import AdminLayout, { type AdminPage } from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import TourManagement from './components/TourManagement';
import BookingManagement from './components/BookingManagement';
import UserManagement from './components/UserManagement';
import { TOURS } from './data/tours';
import { MOCK_BOOKINGS } from './data/mockBookings';
import { MOCK_USERS } from './data/mockUsers';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Booking, BookingStatus, Tour } from './types';

function App() {
  const [adminName, setAdminName] = useLocalStorage<string>('goready_admin_name', '');
  const [page, setPage] = React.useState<AdminPage>('dashboard');

  const [tours, setTours] = useLocalStorage<Tour[]>('goready_admin_tours', TOURS);
  const [bookings, setBookings] = useLocalStorage<Booking[]>('goready_admin_bookings', MOCK_BOOKINGS);
  const [users, setUsers] = useLocalStorage('goready_admin_users', MOCK_USERS);

  if (!adminName) {
    return <AdminLogin onLogin={setAdminName} />;
  }

  const handleAddTour = (tour: Tour) => setTours((prev) => [tour, ...prev]);
  const handleUpdateTour = (tour: Tour) => setTours((prev) => prev.map((t) => (t.id === tour.id ? tour : t)));
  const handleDeleteTour = (tourId: string) => setTours((prev) => prev.filter((t) => t.id !== tourId));
  const handleToggleHidden = (tourId: string) =>
    setTours((prev) => prev.map((t) => (t.id === tourId ? { ...t, hidden: !t.hidden } : t)));

  const handleChangeBookingStatus = (bookingId: string, status: BookingStatus) =>
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));

  const handleToggleUserStatus = (userId: string) =>
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: u.status === 'active' ? 'locked' : 'active' } : u)));

  return (
    <AdminLayout page={page} onNavigate={setPage} adminName={adminName} onLogout={() => setAdminName('')}>
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
