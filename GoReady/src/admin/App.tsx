import React from 'react';
import AdminLogin from './components/AdminLogin';
import AdminLayout, { type AdminPage } from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import TourManagement from './components/TourManagement';
import BookingManagement from './components/BookingManagement';
import UserManagement from './components/UserManagement';
import ArticleManagement from './components/ArticleManagement';
import CommentManagement from './components/CommentManagement';
import { api } from '../api';
import { addSheetToursIfMissing } from './importSheetTours';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePolledResource } from '../hooks/usePolledResource';
import type { Article, BookingStatus, Tour } from '../types';

function App() {
  const [adminEmail, setAdminEmail] = useLocalStorage<string>('goready_admin_email', '');
  const [page, setPage] = React.useState<AdminPage>('dashboard');

  const { data: toursData, refresh: refreshTours } = usePolledResource(api.getTours);
  const { data: bookingsData, refresh: refreshBookings } = usePolledResource(api.getBookings);
  const { data: usersData, refresh: refreshUsers } = usePolledResource(api.getUsers);
  const { data: articlesData, refresh: refreshArticles } = usePolledResource(api.getArticles);
  const { data: commentsData, refresh: refreshComments } = usePolledResource(api.getComments);
  const tours = toursData ?? [];
  const bookings = bookingsData ?? [];
  const users = usersData ?? [];
  const articles = articlesData ?? [];
  const comments = commentsData ?? [];

  // First time only: the tours of the Google Sheet are added to the database by themselves, so they appear in
  // Quản lý Tour like any other tour (the rules are in addSheetToursIfMissing). Waits for the first tour list.
  const [sheetNotice, setSheetNotice] = React.useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const sheetSyncStarted = React.useRef(false);
  React.useEffect(() => {
    if (!adminEmail || toursData === null || sheetSyncStarted.current) return;
    sheetSyncStarted.current = true;
    addSheetToursIfMissing(toursData)
      .then(async ({ created, failed }) => {
        if (created === 0 && failed.length === 0) return;
        await refreshTours();
        const failedText = failed.length ? ` ${failed.length} tour lỗi (${failed.map((f) => f.code).join(', ')}): ${failed[0].message}` : '';
        setSheetNotice({ tone: failed.length ? 'warn' : 'ok', text: `Đã tự động thêm ${created} tour từ Google Sheet vào danh sách.${failedText}` });
      })
      .catch((err) => console.warn('Không đọc được Google Sheet để thêm tour:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail, toursData]);

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
  // Sets (not toggles) the flag, so a repeated request is harmless. Throws when the request fails: the caller rolls back
  const handleSetFeatured = async (tourId: string, isFeatured: boolean) => {
    await api.updateTour(tourId, { isFeatured });
    await refreshTours();
  };

  const handleChangeBookingStatus = async (bookingId: string, status: BookingStatus) => {
    await api.updateBookingStatus(bookingId, status);
    refreshBookings();
  };

  const handleToggleUserStatus = async (userId: string) => {
    await api.toggleUserStatus(userId);
    refreshUsers();
  };

  const handleAddArticle = async (article: Article) => {
    await api.createArticle(article);
    refreshArticles();
  };
  const handleUpdateArticle = async (article: Article) => {
    await api.updateArticle(article.id, article);
    refreshArticles();
  };
  const handleDeleteArticle = async (articleId: string) => {
    await api.deleteArticle(articleId);
    refreshArticles();
  };
  const handleToggleArticleHidden = async (articleId: string) => {
    await api.toggleArticleHidden(articleId);
    refreshArticles();
  };
  // Sends the value opposite to what the row shows (not a server-side toggle), so it matches what the admin clicked
  const handleToggleArticlePinned = async (article: Article) => {
    await api.updateArticle(article.id, { pinned: !article.pinned });
    refreshArticles();
  };

  const handleSetCommentHidden = async (commentId: string, hidden: boolean) => {
    await api.setCommentHidden(commentId, hidden);
    refreshComments();
    refreshArticles(); // commentCount only counts visible comments
  };
  const handleDeleteComment = async (commentId: string) => {
    await api.deleteComment(commentId);
    refreshComments();
    refreshArticles();
  };

  return (
    <AdminLayout page={page} onNavigate={setPage} adminName={adminUser.name} onLogout={() => setAdminEmail('')}>
      {page === 'dashboard' && <Dashboard tours={tours} bookings={bookings} users={users} articles={articles} />}
      {page === 'tours' && (
        <TourManagement tours={tours} onAdd={handleAddTour} onUpdate={handleUpdateTour} onDelete={handleDeleteTour} onToggleHidden={handleToggleHidden} onSetFeatured={handleSetFeatured}
          notice={sheetNotice}
          onDismissNotice={() => setSheetNotice(null)}
        />
      )}
      {page === 'bookings' && <BookingManagement bookings={bookings} tours={tours} onChangeStatus={handleChangeBookingStatus} />}
      {page === 'users' && <UserManagement users={users} onToggleStatus={handleToggleUserStatus} />}
      {page === 'articles' && (
        <ArticleManagement
          articles={articles}
          tours={tours}
          onAdd={handleAddArticle}
          onUpdate={handleUpdateArticle}
          onDelete={handleDeleteArticle}
          onToggleHidden={handleToggleArticleHidden}
          onTogglePinned={handleToggleArticlePinned}
          adminName={adminUser.name}
        />
      )}
      {page === 'comments' && <CommentManagement comments={comments} onSetHidden={handleSetCommentHidden} onDelete={handleDeleteComment} />}
    </AdminLayout>
  );
}

export default App;
