import React from 'react';

interface AdminLoginProps {
  onLogin: (name: string) => void;
}

const USER_SITE_URL = 'http://localhost:5183';

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('admin@goready.vn');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = email.split('@')[0] || 'Admin';
    onLogin(name);
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
        <p className="mt-1 text-sm text-slate-500">Dành cho đội ngũ vận hành GoReady. Đây là bản demo, không cần tài khoản thật.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email quản trị</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            className="mt-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600"
          >
            Đăng nhập
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
