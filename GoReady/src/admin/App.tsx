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
  const [adminName, setAdminName] = useLocalStorage<string>('goready_admin_name', '');
  const [page, setPage] = React.useState<AdminPage>('dashboard');

  const { data: toursData, refresh: refreshTours } = usePolledResource(api.getTours);
  const { data: bookingsData, refresh: refreshBookings } = usePolledResource(api.getBookings);
  const { data: usersData, refresh: refreshUsers } = usePolledResource(api.getUsers);
  const tours = toursData ?? [];
  const bookings = bookingsData ?? [];
  const users = usersData ?? [];

  if (!adminName) {
    return <AdminLogin onLogin={setAdminName} />;
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
