import React from 'react';
import { api, type SellerProfile } from '../api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useHashRoute } from './useHashRoute';
import SellerLogin from './SellerLogin';
import SellerProfileForm from './SellerProfileForm';
import SellerStatus from './SellerStatus';
import SellerShell, { NAV_ITEMS } from './SellerShell';
import MyTours from './MyTours';
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
    return <SellerStatus seller={seller} onRefresh={refresh} onLogout={logout} onEnter={() => navigate('/tour-cua-toi')} />;
  }
  if (path === '/' || path === '/dang-nhap' || path === '/dang-ky' || path === '/sua-ho-so') {
    navigate('/tour-cua-toi', true);
    return null;
  }

  const label = NAV_ITEMS.find((n) => n.path === path)?.label;
  let page: React.ReactNode;
  if (path === '/tour-cua-toi') page = <MyTours token={token} onUnauthorized={logout} />;
  else if (path === '/tour-moi') page = <ComingSoon title="Đăng tour mới" note="Form đăng tour (5 phần) đang được làm ở bước tiếp theo." />;
  else if (path.startsWith('/tour/')) page = <ComingSoon title="Sửa tour" note="Form sửa tour dùng chung với form Đăng tour mới, đang được làm ở bước tiếp theo." />;
  else if (label) page = <ComingSoon title={label} />;
  else page = <ComingSoon title="Không tìm thấy trang" note="Đường dẫn này không tồn tại trong Seller Center." />;

  return <SellerShell path={path} seller={seller} onLogout={logout}>{page}</SellerShell>;
}

export default App;
