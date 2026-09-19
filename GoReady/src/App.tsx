import React from 'react';
import Navbar, { type NavView } from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import FilterBar from './components/FilterBar';
import TourList from './components/TourList';
import FeaturedDestinations from './components/FeaturedDestinations';
import DestinationTabs from './components/DestinationTabs';
import DestinationSearchBox from './components/DestinationSearchBox';
import NewsFeed from './components/NewsFeed';
import TourDetailModal from './components/TourDetailModal';
import TourDetailPage from './components/TourDetailPage';
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
import { useSuggestedTours } from './hooks/useSuggestedTours';
import { mergeSuggestedTours } from './services/suggestedTours';
import { useTourRoute } from './hooks/useTourRoute';
import { pushExplore, readExploreParams, replaceExploreParams, type ExploreParams } from './hooks/useExploreRoute';
import { buildDepartures, formatDMY } from './data/departures';
import { api } from './api';
import type { AiPlannerResult, Booking, ChecklistCategory, ChecklistItem, SearchFilterState, Tour, UserReview } from './types';
import { uid } from './utils/format';
import { groupDestinations, matchesDestination, normalizeText } from './utils/destinations';

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
  // A link straight to #/explore?... starts on Khám phá Tour with that search already applied
  const initialExplore = React.useMemo(() => readExploreParams(), []);
  const [view, setView] = React.useState<NavView>(initialExplore ? 'explore' : 'home');
  const [accountTab, setAccountTab] = React.useState<'profile' | 'reviews' | 'settings' | 'support'>('profile');
  const [filters, setFilters] = React.useState<SearchFilterState>({ ...INITIAL_FILTERS, ...initialExplore });
  const [appliedDestination, setAppliedDestination] = React.useState(initialExplore?.destination ?? '');

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

  const [bookingTour, setBookingTour] = React.useState<Tour | null>(null);
  const [bookingDepartureId, setBookingDepartureId] = React.useState('');
  const [showSaved, setShowSaved] = React.useState(false);
  const [showAi, setShowAi] = React.useState(false);
  const [showLogin, setShowLogin] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const { tours: suggestedTours, status: suggestedStatus, reload: reloadSuggested } = useSuggestedTours();
  const { tourId, openTour, closeTour, dismissTour } = useTourRoute();

  // Every tour that can be opened, saved or booked: tours served by the API + "Gợi ý chuyến đi" tours from the sheet
  const allTours = React.useMemo(() => {
    const seen = new Set<string>();
    // Imported sheet tours exist in both lists: the database copy (editable by the admin) wins
    return [...tours, ...suggestedTours].filter((t) => !seen.has(t.id) && seen.add(t.id));
  }, [tours, suggestedTours]);
  // Direct links never open a tour the admin has hidden
  const activeTour = React.useMemo(
    () => (tourId ? allTours.find((t) => !t.hidden && t.id.toLowerCase() === tourId.toLowerCase()) ?? null : null),
    [tourId, allTours],
  );
  // Both sources load asynchronously: the API tours (null until the first poll returns) and the sheet tours
  const toursLoading = toursData === null || suggestedStatus === 'loading';

  // A #/tour/:id link that matches no tour (once both sources have finished loading)
  React.useEffect(() => {
    if (tourId && !activeTour && !toursLoading) {
      notify('Không tìm thấy tour bạn yêu cầu');
      closeTour();
    }
  }, [tourId, activeTour, toursLoading, closeTour]);

  // Tours from the sheet (they carry a `code`) get the full detail page; API tours keep the modal (map, reviews)
  const detailPage = activeTour?.code ? activeTour : null;
  // #/tour/:id opened directly while tours are still loading: avoid flashing the home page
  const tourLoading = Boolean(tourId && !activeTour && toursLoading);

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

  // Tours imported from the sheet (they carry a `code`): the database copy (what the admin edits: images, price...) once
  // it exists, else the sheet itself. Hidden tours never reach the visitor.
  const { tours: visibleSuggested, fromDatabase: suggestedFromDb } = React.useMemo(() => mergeSuggestedTours(tours, suggestedTours), [tours, suggestedTours]);
  // Every tour a visitor can browse: the other database tours plus the sheet tours
  const exploreTours = React.useMemo(() => [...tours.filter((t) => !t.hidden && !t.code), ...visibleSuggested], [tours, visibleSuggested]);
  // Tabs and suggestions: the destinations that actually have tours (variants such as "Hà Giang Loop" count as "Hà Giang")
  const destinationGroups = React.useMemo(() => groupDestinations(exploreTours), [exploreTours]);
  const activeDestinationKey = destinationGroups.find((g) => g.key === normalizeText(appliedDestination))?.key ?? null;

  const filteredTours = React.useMemo(() => {
    let list = exploreTours.filter((t) => {
      if (!matchesDestination(t, appliedDestination)) return false;
      // Departures are the rolling schedule shown on the tour page: keep tours with a group that still has seats on/after the date
      if (filters.dateFrom && !buildDepartures(t).some((d) => d.date >= filters.dateFrom && d.seatsLeft > 0)) return false;
      // Tours without group tags (all sheet tours) do not restrict who can join, so they stay in the list
      if (filters.groupSize !== 'all' && t.groupSizeTags.length > 0 && !t.groupSizeTags.includes(filters.groupSize)) return false;
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
  }, [exploreTours, appliedDestination, filters]);

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

  const savedTours = allTours.filter((t) => savedIds.includes(t.id));
  const compareTours = allTours.filter((t) => compareIds.includes(t.id));

  const myBookings = React.useMemo(
    () => (currentUserEmail ? bookings.filter((b) => b.contactEmail.toLowerCase() === currentUserEmail.toLowerCase()) : []),
    [bookings, currentUserEmail]
  );

  // "Tour nổi bật": flagged by the admin, and only while the tour is visible
  const featuredTours = React.useMemo(
    () => tours.filter((t) => t.isFeatured && !t.hidden).sort((a, b) => b.bookingCount - a.bookingCount),
    [tours],
  );

  const applyExploreParams = React.useCallback((params: ExploreParams) => {
    setFilters((f) => ({ ...f, destination: params.destination, dateFrom: params.dateFrom, groupSize: params.groupSize }));
    setAppliedDestination(params.destination);
    setView('explore');
  }, []);

  // Home search, destination cards, "Xem tất cả tour": open Khám phá Tour (#/explore?...) with exactly these filters
  const openExplore = (params: Partial<ExploreParams> = {}) => {
    const next: ExploreParams = { destination: '', dateFrom: '', groupSize: 'all', ...params };
    applyExploreParams(next);
    pushExplore(next);
  };

  // The address bar is the route of Khám phá Tour: Back/Forward, reloads and shared links restore the same search
  React.useEffect(() => {
    const sync = () => {
      const params = readExploreParams();
      if (params) applyExploreParams(params);
      // Back from Khám phá to the page before it (a tour route overlays the current page and is not a page change)
      else if (!window.location.hash.startsWith('#/tour/')) setView((v) => (v === 'explore' ? 'home' : v));
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [applyExploreParams]);

  // Keep the URL in step with the applied search (tabs, search box, chips) without piling up history entries;
  // leaving Khám phá by any other means drops its hash so it cannot pull the visitor back later.
  React.useEffect(() => {
    if (tourId) return;
    if (view === 'explore') replaceExploreParams({ destination: appliedDestination, dateFrom: filters.dateFrom, groupSize: filters.groupSize });
    else if (readExploreParams()) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [view, tourId, appliedDestination, filters.dateFrom, filters.groupSize]);

  // Tab / suggestion / "Tìm tour": the text and the applied search stay the same thing
  const commitDestination = (destination: string) => {
    patchFilters({ destination });
    setAppliedDestination(destination.trim());
  };

  const clearExploreFilters = () => {
    setFilters({ ...INITIAL_FILTERS, sortBy: filters.sortBy });
    setAppliedDestination('');
  };

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
        onNavigate={(v) => {
          if (tourId) dismissTour();
          setView(v);
        }}
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

      {detailPage ? (
        <TourDetailPage
          tour={detailPage}
          isSaved={savedIds.includes(detailPage.id)}
          onBack={closeTour}
          onToggleSave={toggleSave}
          onBook={(t, departure) => {
            setBookingDepartureId(departure?.id ?? '');
            setBookingTour(t);
          }}
        />
      ) : tourLoading ? (
        <div className="container-px mx-auto py-24 text-center text-sm text-slate-500">Đang tải thông tin tour…</div>
      ) : view === 'home' ? (
        <>
          <HeroSearch
            filters={filters}
            onChange={patchFilters}
            onSearch={() => openExplore({ destination: filters.destination.trim(), dateFrom: filters.dateFrom, groupSize: filters.groupSize })}
          />
          {/* Nothing is drawn until the tours have loaded, so the empty state never flashes */}
          {toursData !== null && (
            <>
              <section className="container-px mx-auto py-8">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-heading text-xl font-bold text-slate-900">Tour nổi bật</h2>
                  <button
                    onClick={() => openExplore()}
                    className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50"
                  >
                    Xem tất cả tour
                  </button>
                </div>
                {featuredTours.length > 0 ? (
                  <TourList
                    tours={featuredTours}
                    savedIds={savedIds}
                    compareIds={compareIds}
                    onOpenDetail={(t) => openTour(t.id)}
                    onToggleSave={toggleSave}
                    onToggleCompare={toggleCompare}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                    Chưa có tour nổi bật. Hãy xem tất cả tour của GoReady.
                  </div>
                )}
              </section>
              <FeaturedDestinations featuredTours={featuredTours} allTours={exploreTours} onSelectDestination={(destination) => openExplore({ destination })} />
            </>
          )}
        </>
      ) : view === 'explore' ? (
        <>
          <section className="border-b border-slate-100 bg-white">
            <div className="container-px mx-auto py-6">
              <h1 className="font-heading text-2xl font-bold text-slate-900">Khám phá Tour</h1>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <DestinationSearchBox
                  value={filters.destination}
                  onChange={(destination) => patchFilters({ destination })}
                  onSubmit={commitDestination}
                  groups={destinationGroups}
                />
                <button
                  onClick={() => commitDestination(filters.destination)}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-600"
                >
                  Tìm tour
                </button>
              </div>
              {/* Filters that arrive from the home page search and have no input of their own here */}
              {(filters.dateFrom || filters.groupSize !== 'all') && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {filters.dateFrom && (
                    <button
                      onClick={() => patchFilters({ dateFrom: '' })}
                      aria-label="Bỏ lọc ngày khởi hành"
                      className="rounded-full border border-primary bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      Từ ngày {formatDMY(filters.dateFrom)} ✕
                    </button>
                  )}
                  {filters.groupSize !== 'all' && (
                    <button
                      onClick={() => patchFilters({ groupSize: 'all' })}
                      aria-label="Bỏ lọc quy mô đoàn"
                      className="rounded-full border border-primary bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      Nhóm: {filters.groupSize} ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
          <FilterBar filters={filters} onChange={patchFilters} resultCount={filteredTours.length} />
          <main className="container-px mx-auto py-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-slate-900">
                {appliedDestination ? `Kết quả cho "${appliedDestination}"` : 'Tất cả tour'}
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
            <DestinationTabs
              groups={destinationGroups}
              activeKey={activeDestinationKey}
              allActive={!appliedDestination}
              onSelect={commitDestination}
            />
            {suggestedStatus === 'error' && !suggestedFromDb && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                <span>Không tải được danh sách tour gợi ý.</span>
                <button onClick={reloadSuggested} className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50">
                  Thử lại
                </button>
              </div>
            )}
            {toursLoading ? (
              <div className="py-20 text-center text-sm text-slate-500">Đang tải danh sách tour…</div>
            ) : (
              <TourList
                tours={filteredTours}
                savedIds={savedIds}
                compareIds={compareIds}
                onOpenDetail={(t) => openTour(t.id)}
                onToggleSave={toggleSave}
                onToggleCompare={toggleCompare}
                onClear={clearExploreFilters}
              />
            )}
          </main>
        </>
      ) : null}

      {view === 'news' && <NewsFeed />}

      {view === 'trips' && (
        <MyTripsDashboard
          bookings={myBookings}
          tours={allTours}
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
          tours={allTours}
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

      {activeTour && !detailPage && (
        <TourDetailModal
          tour={activeTour}
          isSaved={savedIds.includes(activeTour.id)}
          currentUser={currentUser}
          userReviews={userReviews}
          onAddReview={handleAddReview}
          onClose={closeTour}
          onToggleSave={toggleSave}
          onBook={(t) => {
            closeTour();
            setBookingDepartureId('');
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
            openTour(t.id);
          }}
          onBook={(t) => {
            setShowSaved(false);
            setBookingDepartureId('');
            setBookingTour(t);
          }}
        />
      )}

      {showAi && <AiItineraryModal onClose={() => setShowAi(false)} onSavePlan={handleSaveAiPlan} />}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={handleLoginSubmit} onRegister={handleRegisterSubmit} />}

      {bookingTour && (
        <BookingCheckoutModal
          tour={bookingTour}
          initialDepartureId={bookingDepartureId}
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
