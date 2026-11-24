import React from 'react';
import { api, type SellerProfile, type SellerTourStatus } from '../api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useHashRoute } from './useHashRoute';
import SellerLogin from './SellerLogin';
import SellerProfileForm from './SellerProfileForm';
import SellerStatus from './SellerStatus';
import SellerShell, { NAV_ITEMS } from './SellerShell';
import MyTours from './MyTours';
import BookingManagement, { BOOKING_TABS, type Tab as BookingTab } from './BookingManagement';
import Dashboard from './Dashboard';
import ComingSoon from './ComingSoon';

function App() {
  const { path, navigate } = useHashRoute();
  const [token, setToken] = useLocalStorage<string>('goready_seller_token', '');
  // undefined = đang kiểm tra phiên, null = chưa đăng nhập
  const [seller, setSeller] = React.useState<SellerProfile | null | undefined>(token ? undefined : null);

  const logout = React.useCallback(() => {
    setToken('');
    setSeller(null);
    navigate('/dang-nhap', true);
  }, [setToken, navigate]);

  // Hỏi server hồ sơ + trạng thái của người đang đăng nhập (trạng thái luôn lấy từ server, không tin localStorage)
  const refresh = React.useCallback(async () => {
    if (!token) return setSeller(null);
    try {
      setSeller((await api.sellerMe(token)).seller);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401 || status === 404) {
        setToken('');
        setSeller(null);
      }
      // lỗi mạng: giữ nguyên trạng thái hiện có
    }
  }, [token, setToken]);
  React.useEffect(() => { void refresh(); }, [refresh]);

  // Số booking chờ xác nhận cho huy hiệu trên menu: hỏi lại mỗi 30 giây và sau mỗi hành động
  const [pendingBookings, setPendingBookings] = React.useState(0);
  const approved = seller?.status === 'approved';
  const refreshPending = React.useCallback(() => {
    if (!token || !approved) return;
    api.sellerListBookings(token).then((d) => setPendingBookings(d.counts.pending)).catch(() => {});
  }, [token, approved]);
  React.useEffect(() => {
    refreshPending();
    const id = window.setInterval(refreshPending, 30000);
    return () => window.clearInterval(id);
  }, [refreshPending]);

  const handleLoggedIn = (newToken: string) => {
    setToken(newToken);
    setSeller(undefined);
    navigate('/trang-thai', true); // chặn truy cập bên dưới sẽ chuyển tiếp vào Seller Center nếu đã được duyệt
  };

  // ---------- Chặn truy cập ----------
  if (!token || seller === null) {
    if (path === '/dang-ky') {
      return <SellerProfileForm mode="register" onDone={(t) => { if (t) handleLoggedIn(t); }} />;
    }
    if (path !== '/dang-nhap') navigate('/dang-nhap', true);
    return <SellerLogin onLoggedIn={handleLoggedIn} />;
  }
  if (seller === undefined) {
    return <div className="grid min-h-screen place-items-center bg-surface text-sm text-slate-400">Đang tải...</div>;
  }

  // Chưa được duyệt: chỉ vào được trang Trạng thái hồ sơ (và trang sửa hồ sơ khi bị từ chối)
  if (seller.status !== 'approved') {
    if (path === '/sua-ho-so' && seller.status === 'rejected') {
      return <SellerProfileForm mode="resubmit" token={token} initial={seller} onDone={() => { void refresh(); navigate('/trang-thai'); }} />;
    }
    if (path !== '/trang-thai') navigate('/trang-thai', true);
    return <SellerStatus seller={seller} onRefresh={refresh} onLogout={logout} onEnter={() => {}} />;
  }

  // Đã được duyệt
  if (path === '/trang-thai') {
    return <SellerStatus seller={seller} onRefresh={refresh} onLogout={logout} onEnter={() => navigate('/tong-quan')} />;
  }
  // Trang mặc định sau khi đăng nhập (đã duyệt) là Tổng quan
  if (path === '/' || path === '/dang-nhap' || path === '/dang-ky' || path === '/sua-ho-so') {
    navigate('/tong-quan', true);
    return null;
  }

  // Đường dẫn có thể kèm bộ lọc chọn sẵn: #/booking?status=pending&id=...
  const [route, query = ''] = path.split('?');
  const params = new URLSearchParams(query);

  const label = NAV_ITEMS.find((n) => n.path === route)?.label;
  const bookingTab = BOOKING_TABS.find((t) => t === params.get('status')) as BookingTab | undefined;
  let page: React.ReactNode;
  if (route === '/tong-quan') page = <Dashboard token={token} seller={seller} onUnauthorized={logout} onPendingCount={setPendingBookings} />;
  else if (route === '/tour-cua-toi') {
    const s = params.get('status') ?? '';
    page = <MyTours key={query} token={token} onUnauthorized={logout} initialStatus={['draft', 'pending_review', 'active', 'rejected', 'hidden'].includes(s) ? (s as SellerTourStatus) : ''} />;
  } else if (route === '/booking') page = <BookingManagement key={query} token={token} onUnauthorized={logout} onChanged={refreshPending} initialTab={bookingTab} initialId={params.get('id') ?? ''} />;
  else if (route === '/tour-moi') page = <ComingSoon title="Đăng tour mới" note="Form đăng tour (5 phần) đang được làm ở bước tiếp theo." />;
  else if (route.startsWith('/tour/')) page = <ComingSoon title="Sửa tour" note="Form sửa tour dùng chung với form Đăng tour mới, đang được làm ở bước tiếp theo." />;
  else if (label) page = <ComingSoon title={label} />;
  else page = <ComingSoon title="Không tìm thấy trang" note="Đường dẫn này không tồn tại trong Seller Center." />;

  return <SellerShell path={route} seller={seller} pendingBookings={pendingBookings} onLogout={logout}>{page}</SellerShell>;
}

export default App;
