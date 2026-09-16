import React from 'react';
import Navbar, { type NavView } from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import FilterBar from './components/FilterBar';
import TourList from './components/TourList';
import FeaturedDestinations from './components/FeaturedDestinations';
import NewsFeed from './components/NewsFeed';
import TourDetailModal from './components/TourDetailModal';
import SavedAndCompareModal from './components/SavedAndCompareModal';
import AiItineraryModal from './components/AiItineraryModal';
import BookingCheckoutModal from './components/BookingCheckoutModal';
import MyTripsDashboard from './components/MyTripsDashboard';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';
import { TOURS } from './data/tours';
import { DEFAULT_CHECKLIST } from './data/checklist';
import { MOCK_USERS as SEED_USERS, type AdminUser as AccountUser } from './data/mockUsers';
import { MOCK_BOOKINGS as SEED_BOOKINGS } from './data/mockBookings';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { AiPlannerResult, Booking, ChecklistCategory, ChecklistItem, SearchFilterState, Tour } from './types';
import { uid } from './utils/format';

// Shared with GoReady-Admin via localStorage keys on the same origin (see /admin proxy in vite.config.ts).
const SHARED_TOURS_KEY = 'goready_shared_tours';
const SHARED_BOOKINGS_KEY = 'goready_shared_bookings';
const SHARED_USERS_KEY = 'goready_shared_users';

const INITIAL_FILTERS: SearchFilterState = {
  destination: '',
  dateFrom: '',
  groupSize: 'all',
  budget: 'all',
  styles: [],
  duration: 'all',
  sortBy: 'popular',
};

const priceOf = (t: Tour) => t.discountPrice ?? t.price;

function App() {
  const [view, setView] = React.useState<NavView>('home');
  const [filters, setFilters] = React.useState<SearchFilterState>(INITIAL_FILTERS);
  const [appliedDestination, setAppliedDestination] = React.useState('');

  const [savedIds, setSavedIds] = useLocalStorage<string[]>('goready_saved', []);
  const [compareIds, setCompareIds] = useLocalStorage<string[]>('goready_compare', []);
  const [checklist, setChecklist] = useLocalStorage<ChecklistItem[]>('goready_checklist', DEFAULT_CHECKLIST);
  const [aiPlans, setAiPlans] = useLocalStorage<AiPlannerResult[]>('goready_ai_plans', []);

  // Shared state: read/written by both this app and GoReady-Admin (same origin via /admin proxy).
  const [tours, setTours] = useLocalStorage<Tour[]>(SHARED_TOURS_KEY, TOURS);
  const [bookings, setBookings] = useLocalStorage<Booking[]>(SHARED_BOOKINGS_KEY, SEED_BOOKINGS);
  const [accounts, setAccounts] = useLocalStorage<AccountUser[]>(SHARED_USERS_KEY, SEED_USERS);
  const [currentUserEmail, setCurrentUserEmail] = useLocalStorage<string>('goready_current_user_email', '');

  const [activeTour, setActiveTour] = React.useState<Tour | null>(null);
  const [bookingTour, setBookingTour] = React.useState<Tour | null>(null);
  const [showSaved, setShowSaved] = React.useState(false);
  const [showAi, setShowAi] = React.useState(false);
  const [showLogin, setShowLogin] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const currentUser = React.useMemo(
    () => (currentUserEmail ? accounts.find((u) => u.email.toLowerCase() === currentUserEmail.toLowerCase()) ?? null : null),
    [accounts, currentUserEmail]
  );

  // If an admin locks the account currently browsing (live via the shared "accounts" key), sign them out.
  React.useEffect(() => {
    if (currentUserEmail && !currentUser) return; // account removed, ignore
    if (currentUser && currentUser.status === 'locked') {
      setCurrentUserEmail('');
      notify('Tài khoản của bạn đã bị quản trị viên khoá.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const patchFilters = (patch: Partial<SearchFilterState>) => setFilters((f) => ({ ...f, ...patch }));

  const visibleTours = React.useMemo(() => tours.filter((t) => !t.hidden), [tours]);

  const filteredTours = React.useMemo(() => {
    let list = visibleTours.filter((t) => {
      if (appliedDestination) {
        const q = appliedDestination.toLowerCase();
        if (!t.destination.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.country.toLowerCase().includes(q)) return false;
      }
      if (filters.groupSize !== 'all' && !t.groupSizeTags.includes(filters.groupSize)) return false;
      if (filters.styles.length > 0 && !filters.styles.some((s) => t.styleTags.includes(s))) return false;
      if (filters.duration !== 'all') {
        const d = t.duration;
        if (filters.duration === '1-2' && !(d >= 1 && d <= 2)) return false;
        if (filters.duration === '3-4' && !(d >= 3 && d <= 4)) return false;
        if (filters.duration === '5-plus' && d < 5) return false;
      }
      if (filters.budget !== 'all') {
        const p = priceOf(t);
        if (filters.budget === 'under-3' && p >= 3000000) return false;
        if (filters.budget === '3-5' && !(p >= 3000000 && p <= 5000000)) return false;
        if (filters.budget === '5-10' && !(p > 5000000 && p <= 10000000)) return false;
        if (filters.budget === 'over-10' && p <= 10000000) return false;
      }
      return true;
    });

    switch (filters.sortBy) {
      case 'price-asc':
        list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case 'rating':
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      default:
        list = [...list].sort((a, b) => b.bookingCount - a.bookingCount);
    }
    return list;
  }, [visibleTours, appliedDestination, filters]);

  const toggleSave = (tourId: string) => {
    setSavedIds((prev) => {
      const has = prev.includes(tourId);
      notify(has ? 'Đã bỏ lưu tour' : 'Đã lưu tour vào thư viện của bạn');
      return has ? prev.filter((id) => id !== tourId) : [...prev, tourId];
    });
  };

  const toggleCompare = (tourId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(tourId)) return prev.filter((id) => id !== tourId);
      if (prev.length >= 3) {
        notify('Bạn chỉ có thể so sánh tối đa 3 tour');
        return prev;
      }
      return [...prev, tourId];
    });
  };

  const handleToggleChecklist = (id: string) =>
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));

  const handleAddChecklistItem = (category: ChecklistCategory, label: string) =>
    setChecklist((prev) => [...prev, { id: uid('chk'), category, label, checked: false, custom: true }]);

  const handleConfirmBooking = (booking: Booking) => {
    setBookings((prev) => [...prev, booking]);
    setAccounts((prev) =>
      prev.map((u) => (u.email.toLowerCase() === booking.contactEmail.toLowerCase() ? { ...u, totalBookings: u.totalBookings + 1 } : u))
    );
    notify('Đặt tour thành công! Xem vé tại "Chuyến đi của tôi"');
  };

  const handleSaveAiPlan = (plan: AiPlannerResult) => {
    setAiPlans((prev) => [plan, ...prev]);
    notify('Đã lưu lịch trình AI vào chuyến đi của tôi');
  };

  const savedTours = tours.filter((t) => savedIds.includes(t.id));
  const compareTours = tours.filter((t) => compareIds.includes(t.id));

  const myBookings = React.useMemo(
    () => (currentUserEmail ? bookings.filter((b) => b.contactEmail.toLowerCase() === currentUserEmail.toLowerCase()) : []),
    [bookings, currentUserEmail]
  );

  const featuredTours = React.useMemo(() => [...visibleTours].sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 8), [visibleTours]);

  const goToExplore = (destination = '') => {
    patchFilters({ destination });
    setAppliedDestination(destination);
    setView('explore');
  };

  const handleSelectDestination = (destination: string) => goToExplore(destination);

  const handleLoginSubmit = (name: string, email: string) => {
    const existing = accounts.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      if (existing.status === 'locked') {
        notify('Tài khoản này đã bị quản trị viên khoá. Vui lòng liên hệ hỗ trợ.');
        return;
      }
      setCurrentUserEmail(existing.email);
      notify(`Đăng nhập thành công! Chào mừng bạn quay lại, ${existing.name}`);
    } else {
      const newAccount: AccountUser = {
        id: uid('usr'),
        name,
        email,
        phone: '',
        joinedAt: new Date().toISOString().slice(0, 10),
        totalBookings: 0,
        status: 'active',
      };
      setAccounts((prev) => [...prev, newAccount]);
      setCurrentUserEmail(email);
      notify('Đăng ký & đăng nhập thành công! Chào mừng bạn đến với GoReady');
    }
    setShowLogin(false);
  };

  return (
    <div className="min-h-screen bg-surface font-body">
      <Navbar
        view={view}
        onNavigate={setView}
        savedCount={savedIds.length}
        compareCount={compareIds.length}
        onOpenSaved={() => setShowSaved(true)}
        onOpenAi={() => setShowAi(true)}
        userName={currentUser?.name ?? null}
        onOpenLogin={() => setShowLogin(true)}
        onLogout={() => {
          setCurrentUserEmail('');
          notify('Bạn đã đăng xuất');
        }}
        onAccountAction={(label) => notify(`${label}: tính năng đang được phát triển`)}
      />

      {view === 'home' && (
        <>
          <HeroSearch filters={filters} onChange={patchFilters} tours={visibleTours} onSearch={() => goToExplore(filters.destination)} />
          <section className="container-px mx-auto py-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-slate-900">Tour nổi bật</h2>
              <button
                onClick={() => goToExplore()}
                className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50"
              >
                Xem tất cả tour
              </button>
            </div>
            <TourList
              tours={featuredTours}
              savedIds={savedIds}
              compareIds={compareIds}
              onOpenDetail={setActiveTour}
              onToggleSave={toggleSave}
              onToggleCompare={toggleCompare}
            />
          </section>
          <FeaturedDestinations tours={visibleTours} onSelectDestination={handleSelectDestination} />
        </>
      )}

      {view === 'explore' && (
        <>
          <section className="border-b border-slate-100 bg-white">
            <div className="container-px mx-auto py-6">
              <h1 className="font-heading text-2xl font-bold text-slate-900">Khám phá Tour</h1>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={filters.destination}
                  onChange={(e) => patchFilters({ destination: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && setAppliedDestination(filters.destination)}
                  placeholder="Tìm theo điểm đến: Đà Nẵng, Phú Quốc, Tokyo..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
                />
                <button
                  onClick={() => setAppliedDestination(filters.destination)}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-600"
                >
                  Tìm tour
                </button>
              </div>
            </div>
          </section>
          <FilterBar filters={filters} onChange={patchFilters} resultCount={filteredTours.length} />
          <main className="container-px mx-auto py-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-slate-900">
                {appliedDestination ? `Kết quả cho "${appliedDestination}"` : 'Tất cả tour nổi bật'}
              </h2>
              {compareIds.length > 0 && (
                <button
                  onClick={() => setShowSaved(true)}
                  className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50"
                >
                  So sánh ({compareIds.length})
                </button>
              )}
            </div>
            <TourList
              tours={filteredTours}
              savedIds={savedIds}
              compareIds={compareIds}
              onOpenDetail={setActiveTour}
              onToggleSave={toggleSave}
              onToggleCompare={toggleCompare}
            />
          </main>
        </>
      )}

      {view === 'news' && <NewsFeed />}

      {view === 'trips' && (
        <MyTripsDashboard
          bookings={myBookings}
          tours={tours}
          checklist={checklist}
          onToggleChecklist={handleToggleChecklist}
          onAddChecklistItem={handleAddChecklistItem}
          aiPlans={aiPlans}
        />
      )}

      <Footer />

      {activeTour && (
        <TourDetailModal
          tour={activeTour}
          isSaved={savedIds.includes(activeTour.id)}
          onClose={() => setActiveTour(null)}
          onToggleSave={toggleSave}
          onBook={(t) => {
            setActiveTour(null);
            setBookingTour(t);
          }}
        />
      )}

      {showSaved && (
        <SavedAndCompareModal
          savedTours={savedTours}
          compareTours={compareTours}
          onClose={() => setShowSaved(false)}
          onRemoveSaved={toggleSave}
          onToggleCompare={toggleCompare}
          onOpenDetail={(t) => {
            setShowSaved(false);
            setActiveTour(t);
          }}
          onBook={(t) => {
            setShowSaved(false);
            setBookingTour(t);
          }}
        />
      )}

      {showAi && <AiItineraryModal onClose={() => setShowAi(false)} onSavePlan={handleSaveAiPlan} />}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSubmit={handleLoginSubmit} />}

      {bookingTour && (
        <BookingCheckoutModal
          tour={bookingTour}
          onClose={() => setBookingTour(null)}
          onConfirm={handleConfirmBooking}
          defaultName={currentUser?.name}
          defaultEmail={currentUser?.email}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-xl animate-fadeIn">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
