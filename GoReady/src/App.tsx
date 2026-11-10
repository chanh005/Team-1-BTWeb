import React from 'react';
import Navbar, { type NavView } from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import TourFilter, { type TourFilterState } from './components/TourFilter';
import TourList from './components/TourList';
import FeaturedDestinations from './components/FeaturedDestinations';
import NewsFeed from './components/NewsFeed';
import TourDetailModal from './components/TourDetailModal';
import SavedAndCompareModal from './components/SavedAndCompareModal';
import AiItineraryModal from './components/AiItineraryModal';
import BookingCheckoutModal from './components/BookingCheckoutModal';
import MyTripsDashboard from './components/MyTripsDashboard';
import LoginModal from './components/LoginModal';
import AccountPage from './components/AccountPage';
import Footer from './components/Footer';
import { DEFAULT_CHECKLIST } from './data/checklist';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolledResource } from './hooks/usePolledResource';
import { api } from './api';
import type { AiPlannerResult, Booking, ChecklistCategory, ChecklistItem, DurationRange, SearchFilterState, Tour, UserReview } from './types';
import { uid } from './utils/format';

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
  const [accountTab, setAccountTab] = React.useState<'profile' | 'reviews' | 'settings' | 'support'>('profile');
  const [filters, setFilters] = React.useState<SearchFilterState>(INITIAL_FILTERS);
  const [appliedDestination, setAppliedDestination] = React.useState('');

  const [savedIds, setSavedIds] = useLocalStorage<string[]>('goready_saved', []);
  const [compareIds, setCompareIds] = useLocalStorage<string[]>('goready_compare', []);
  const [checklist, setChecklist] = useLocalStorage<ChecklistItem[]>('goready_checklist', DEFAULT_CHECKLIST);
  const [aiPlans, setAiPlans] = useLocalStorage<AiPlannerResult[]>('goready_ai_plans', []);
  const [userReviews, setUserReviews] = useLocalStorage<UserReview[]>('goready_user_reviews', []);
  const [currentUserEmail, setCurrentUserEmail] = useLocalStorage<string>('goready_current_user_email', '');
  const [currentUserRole, setCurrentUserRole] = useLocalStorage<'user' | 'admin' | ''>('goready_current_user_role', '');

  // Shared state: served by the backend API, polled so changes made from the
  // Admin console (add/edit/hide a tour, change a booking status, lock a user)
  // show up here without a manual refresh.
  const { data: toursData, refresh: refreshTours } = usePolledResource(api.getTours);
  const { data: bookingsData, refresh: refreshBookings } = usePolledResource(api.getBookings);
  const { data: accountsData, refresh: refreshAccounts } = usePolledResource(api.getUsers);
  const tours = toursData ?? [];
  const bookings = bookingsData ?? [];
  const accounts = accountsData ?? [];

  const [activeTour, setActiveTour] = React.useState<Tour | null>(null);
  const [bookingTour, setBookingTour] = React.useState<Tour | null>(null);
  const [showSaved, setShowSaved] = React.useState(false);
  const [showAi, setShowAi] = React.useState(false);
  const [showLogin, setShowLogin] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // New TourFilter states
  const [selectedDurations, setSelectedDurations] = React.useState<DurationRange[]>([]);
  const [customPriceRange, setCustomPriceRange] = React.useState<[number, number] | null>(null);
  const [onlyPopular, setOnlyPopular] = React.useState(false);
  const [minRating, setMinRating] = React.useState<number | undefined>(undefined);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = React.useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const currentUser = React.useMemo(
    () => (currentUserEmail ? accounts.find((u) => u.email.toLowerCase() === currentUserEmail.toLowerCase()) ?? null : null),
    [accounts, currentUserEmail]
  );

  // If an admin locks the account currently browsing (picked up on the next poll), sign them out.
  React.useEffect(() => {
    if (currentUserEmail && !currentUser) return; // account list hasn't loaded yet, or was removed
    if (currentUser && currentUser.status === 'locked') {
      setCurrentUserEmail('');
      setCurrentUserRole('');
      notify('Tài khoản của bạn đã bị quản trị viên khoá.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const patchFilters = (patch: Partial<SearchFilterState>) => setFilters((f) => ({ ...f, ...patch }));

  const visibleTours = React.useMemo(() => tours.filter((t) => !t.hidden), [tours]);

  const allValidPrices = React.useMemo(() => {
    return visibleTours
      .map(priceOf)
      .filter((p): p is number => typeof p === 'number' && !isNaN(p) && p > 0);
  }, [visibleTours]);

  const defaultMinPrice = allValidPrices.length ? Math.min(...allValidPrices) : 0;
  const defaultMaxPrice = allValidPrices.length ? Math.max(...allValidPrices) : 0;

  const effectivePriceRange: [number, number] = React.useMemo(() => {
    if (!customPriceRange) return [defaultMinPrice, defaultMaxPrice];
    return customPriceRange;
  }, [customPriceRange, defaultMinPrice, defaultMaxPrice]);

  const filteredTours = React.useMemo(() => {
    let list = visibleTours.filter((t) => {
      // 1. Điểm đến
      if (appliedDestination) {
        const q = appliedDestination.toLowerCase();
        if (!t.destination.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.country.toLowerCase().includes(q)) return false;
      }
      if (filters.groupSize !== 'all' && !t.groupSizeTags.includes(filters.groupSize)) return false;
      if (filters.styles.length > 0 && !filters.styles.some((s) => t.styleTags.includes(s))) return false;

      // 2. Thời gian (gom nhóm checkbox số ngày)
      if (selectedDurations.length > 0) {
        const d = t.duration;
        const match = selectedDurations.some((range) => {
          if (range === '1-2') return d >= 1 && d <= 2;
          if (range === '3-4') return d >= 3 && d <= 4;
          if (range === '5-plus') return d >= 5;
          return false;
        });
        if (!match) return false;
      } else if (filters.duration !== 'all') {
        const d = t.duration;
        if (filters.duration === '1-2' && !(d >= 1 && d <= 2)) return false;
        if (filters.duration === '3-4' && !(d >= 3 && d <= 4)) return false;
        if (filters.duration === '5-plus' && d < 5) return false;
      }

      // 3. Ngân sách (thanh trượt 2 đầu)
      if (customPriceRange && defaultMaxPrice > defaultMinPrice) {
        const p = priceOf(t);
        if (typeof p !== 'number' || isNaN(p) || p <= 0) return false;
        if (p < effectivePriceRange[0] || p > effectivePriceRange[1]) return false;
      } else if (filters.budget !== 'all') {
        const p = priceOf(t);
        if (filters.budget === 'under-3' && p >= 3000000) return false;
        if (filters.budget === '3-5' && !(p >= 3000000 && p <= 5000000)) return false;
        if (filters.budget === '5-10' && !(p > 5000000 && p <= 10000000)) return false;
        if (filters.budget === 'over-10' && p <= 10000000) return false;
      }

      // 4. Phổ biến & Đánh giá (cùng nhóm checkbox: OR)
      if (onlyPopular || typeof minRating === 'number') {
        const popMatches: boolean[] = [];
        if (onlyPopular) popMatches.push((t.bookingCount ?? 0) >= 100);
        if (typeof minRating === 'number') popMatches.push((t.rating ?? 0) >= minRating);
        if (!popMatches.some(Boolean)) return false;
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
  }, [
    visibleTours,
    appliedDestination,
    selectedDurations,
    customPriceRange,
    effectivePriceRange,
    defaultMinPrice,
    defaultMaxPrice,
    onlyPopular,
    minRating,
    filters,
  ]);

  const handleTourFilterChange = (patch: Partial<TourFilterState>) => {
    if (patch.destination !== undefined) {
      patchFilters({ destination: patch.destination });
      setAppliedDestination(patch.destination);
    }
    if (patch.priceRange !== undefined) {
      setCustomPriceRange(patch.priceRange);
    }
    if (patch.durations !== undefined) {
      setSelectedDurations(patch.durations);
    }
    if (patch.sortBy !== undefined) {
      patchFilters({ sortBy: patch.sortBy });
    }
    if ('minRating' in patch) {
      setMinRating(patch.minRating);
    }
    if ('onlyPopular' in patch) {
      setOnlyPopular(Boolean(patch.onlyPopular));
    }
    if (patch.styles !== undefined) {
      patchFilters({ styles: patch.styles });
    }
    if (patch.groupSize !== undefined) {
      patchFilters({ groupSize: patch.groupSize });
    }
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedDestination('');
    setCustomPriceRange(null);
    setSelectedDurations([]);
    setOnlyPopular(false);
    setMinRating(undefined);
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (appliedDestination || filters.destination) count++;
    if (selectedDurations.length > 0) count++;
    if (customPriceRange && (customPriceRange[0] > defaultMinPrice || customPriceRange[1] < defaultMaxPrice)) count++;
    if (filters.sortBy !== 'popular') count++;
    if (minRating) count++;
    if (onlyPopular) count++;
    if (filters.styles.length > 0) count++;
    return count;
  }, [
    appliedDestination,
    filters.destination,
    selectedDurations,
    customPriceRange,
    defaultMinPrice,
    defaultMaxPrice,
    filters.sortBy,
    minRating,
    onlyPopular,
    filters.styles,
  ]);

  const tourFilterState: TourFilterState = {
    destination: filters.destination || appliedDestination,
    priceRange: effectivePriceRange,
    durations: selectedDurations,
    sortBy: filters.sortBy,
    minRating,
    onlyPopular,
    styles: filters.styles,
    groupSize: filters.groupSize,
  };

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

  const handleConfirmBooking = async (booking: Booking) => {
    try {
      await api.createBooking(booking);
      await Promise.all([refreshBookings(), refreshAccounts()]);
      notify('Đặt tour thành công! Xem vé tại "Chuyến đi của tôi"');
    } catch {
      notify('Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend đã chạy chưa.');
    }
  };

  const handleSaveAiPlan = (plan: AiPlannerResult) => {
    setAiPlans((prev) => [plan, ...prev]);
    notify('Đã lưu lịch trình AI vào chuyến đi của tôi');
  };

  const handleAddReview = (review: Omit<UserReview, 'id' | 'date' | 'authorEmail'>) => {
    if (!currentUserEmail) return;
    const newReview: UserReview = {
      ...review,
      id: uid('rev'),
      date: new Date().toISOString(),
      authorEmail: currentUserEmail.toLowerCase(),
    };
    setUserReviews((prev) => [newReview, ...prev]);
    notify('Đánh giá của bạn đã được gửi thành công!');
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

  const handleLoginSubmit = async (email: string, password: string) => {
    try {
      const account = await api.login(email, password);
      setCurrentUserEmail(account.email);
      setCurrentUserRole(account.role ?? 'user');
      refreshAccounts();
      if (account.role === 'admin') {
        notify(`Đăng nhập Admin thành công! Chào mừng, ${account.name} 👑`);
      } else {
        notify(`Đăng nhập thành công! Chào mừng bạn, ${account.name}`);
      }
      setShowLogin(false);
    } catch (err) {
      // Re-throw so LoginModal can handle and display the error
      throw err;
    }
  };

  const handleRegisterSubmit = async (name: string, email: string, password: string) => {
    try {
      const account = await api.register(name, email, password);
      setCurrentUserEmail(account.email);
      setCurrentUserRole(account.role ?? 'user');
      refreshAccounts();
      notify(`Đăng ký thành công! Chào mừng bạn, ${account.name} 🎉`);
      setShowLogin(false);
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateAvatar = async (avatar: string) => {
    if (!currentUser) return;
    await api.updateAvatar(currentUser.id, avatar);
    refreshAccounts();
  };

  const handleCancelBooking = async (bookingId: string) => {
    await api.updateBookingStatus(bookingId, 'cancelled');
    refreshBookings();
    notify('Đã hủy tour. Yêu cầu hoàn tiền của bạn đang được xử lý.');
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
        userRole={(currentUserRole as 'user' | 'admin') || null}
        avatarUrl={currentUser?.avatar ?? null}
        onOpenLogin={() => setShowLogin(true)}
        onLogout={() => {
          setCurrentUserEmail('');
          setCurrentUserRole('');
          setView('home');
          notify('Bạn đã đăng xuất');
        }}
        onOpenAccountTab={(tab) => {
          setAccountTab(tab);
          setView('account');
        }}
      />

      {view === 'home' && (
        <>
          <HeroSearch filters={filters} onChange={patchFilters} onSearch={() => goToExplore(filters.destination)} />
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
          {/* Mobile Filter Trigger Button */}
          <div className="container-px mx-auto pt-4 lg:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary cursor-pointer"
              >
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Bộ lọc</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <span className="text-xs text-slate-400 font-medium">{filteredTours.length} tour</span>
            </div>
          </div>

          {/* Mobile Drawer */}
          {isMobileFilterOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileFilterOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 flex max-w-xs w-full flex-col bg-white shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <span className="font-heading font-bold text-slate-900">Bộ lọc tour</span>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <TourFilter
                    tours={visibleTours}
                    filters={tourFilterState}
                    onChange={handleTourFilterChange}
                    onReset={handleResetFilters}
                    resultCount={filteredTours.length}
                  />
                </div>
                <div className="border-t border-slate-100 p-4 bg-white">
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-full rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-white shadow-card hover:bg-primary-600"
                  >
                    Xem {filteredTours.length} tour
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Layout: Desktop Sidebar + Tour Grid */}
          <main className="container-px mx-auto py-8">
            <div className="flex flex-col lg:flex-row items-start gap-8">
              {/* Desktop Filter Panel */}
              <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-20">
                <TourFilter
                  tours={visibleTours}
                  filters={tourFilterState}
                  onChange={handleTourFilterChange}
                  onReset={handleResetFilters}
                  resultCount={filteredTours.length}
                />
              </aside>

              {/* Tour Results */}
              <div className="flex-1 min-w-0">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-heading text-xl font-bold text-slate-900">
                    {appliedDestination ? `Kết quả cho "${appliedDestination}"` : 'Tất cả tour nổi bật'}
                    <span className="ml-2 text-sm font-normal text-slate-400">({filteredTours.length} tour)</span>
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
                {filteredTours.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 px-6 text-center shadow-soft">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                      <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="mb-1 font-heading text-lg font-bold text-slate-900">
                      Không tìm thấy tour phù hợp
                    </h3>
                    <p className="mb-5 max-w-md text-xs text-slate-500">
                      Không có tour nào thỏa mãn tất cả tiêu chí bạn đã chọn. Hãy thử nới rộng khoảng lọc hoặc bấm nút bên dưới để xem lại tất cả tour.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-card transition hover:bg-primary-600 cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Đặt lại bộ lọc
                    </button>
                  </div>
                ) : (
                  <TourList
                    tours={filteredTours}
                    savedIds={savedIds}
                    compareIds={compareIds}
                    onOpenDetail={setActiveTour}
                    onToggleSave={toggleSave}
                    onToggleCompare={toggleCompare}
                  />
                )}
              </div>
            </div>
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
          onCancelBooking={handleCancelBooking}
          aiPlans={aiPlans}
        />
      )}

      {view === 'account' && currentUser && (
        <AccountPage
          key={accountTab}
          initialTab={accountTab}
          currentUser={currentUser}
          myBookings={myBookings}
          tours={tours}
          userReviews={userReviews.filter(r => r.authorEmail === currentUser.email.toLowerCase())}
          onLogout={() => {
            setCurrentUserEmail('');
            setCurrentUserRole('');
            setView('home');
            notify('Bạn đã đăng xuất');
          }}
          onNavigate={(v) => setView(v)}
          onUpdateAvatar={handleUpdateAvatar}
        />
      )}

      <Footer />

      {activeTour && (
        <TourDetailModal
          tour={activeTour}
          isSaved={savedIds.includes(activeTour.id)}
          currentUser={currentUser}
          userReviews={userReviews}
          onAddReview={handleAddReview}
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

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={handleLoginSubmit} onRegister={handleRegisterSubmit} />}

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
