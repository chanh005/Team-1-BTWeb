import React from 'react';
import { api } from '../api';
import { Card, Field, Logo, inputClass, primaryBtn } from './ui';

interface Props {
  onLoggedIn: (token: string) => void;
}

const SellerLogin: React.FC<Props> = ({ onLoggedIn }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.sellerLogin(email.trim(), password);
      if (!res.seller) {
        setError('Tài khoản này chưa có hồ sơ người bán.');
        return;
      }
      onLoggedIn(res.token);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) setError('Email hoặc mật khẩu không đúng.');
      else if (status === 403) setError((err as Error).message || 'Tài khoản không được phép đăng nhập.');
      else setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <Logo />
        <a href="#/dang-ky" className="text-sm font-semibold text-[#3D72BB] hover:underline">Đăng ký người bán</a>
      </header>
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <h1 className="text-2xl font-bold text-slate-900">Đăng nhập Seller Center</h1>
          <p className="mt-1 text-sm text-slate-500">Dành cho doanh nghiệp lữ hành và đơn vị tổ chức tour.</p>
          {error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <Field label="Email" name="email">
              <input type="email" required autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} className={inputClass()} placeholder="email@doanhnghiep.vn" />
            </Field>
            <Field label="Mật khẩu" name="password">
              <input type="password" required value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} className={inputClass()} placeholder="Mật khẩu" />
            </Field>
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Chưa có tài khoản người bán? <a href="#/dang-ky" className="font-semibold text-[#3D72BB] hover:underline">Đăng ký</a>
          </p>
        </Card>
      </main>
    </div>
  );
};

export default SellerLogin;
