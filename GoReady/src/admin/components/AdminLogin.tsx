import React from 'react';

interface AdminLoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const USER_SITE_URL = '/';

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      const message = (err as Error).message;
      if (message === 'not_admin') setError('Tài khoản này không có quyền truy cập trang quản trị.');
      else if (status === 401) setError('Email hoặc mật khẩu không đúng.');
      else if (status === 403) setError('Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ.');
      else setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white text-lg font-heading font-bold shadow-card">G</span>
          <div>
            <p className="font-heading text-lg font-bold text-slate-900">
              Go<span className="text-primary">Ready</span>
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin Console</p>
          </div>
        </div>

        <h1 className="mt-6 font-heading text-xl font-bold text-slate-900">Đăng nhập quản trị</h1>
        <p className="mt-1 text-sm text-slate-500">Dành cho đội ngũ vận hành GoReady. Chỉ tài khoản có quyền admin mới truy cập được.</p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100 animate-fadeIn">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email quản trị</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
              placeholder="admin@goready.vn"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mật khẩu</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <a
          href={USER_SITE_URL}
          className="mt-6 block text-center text-xs font-semibold text-slate-400 hover:text-primary"
        >
          ← Quay lại trang người dùng
        </a>
      </div>
    </div>
  );
};

export default AdminLogin;
