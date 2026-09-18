import React from 'react';

type Tab = 'login' | 'register';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, onRegister }) => {
  const [tab, setTab] = React.useState<Tab>('login');

  // Login state
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [showLoginPwd, setShowLoginPwd] = React.useState(false);

  // Register state
  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');
  const [regConfirm, setRegConfirm] = React.useState('');
  const [showRegPwd, setShowRegPwd] = React.useState(false);
  const [showRegConfirm, setShowRegConfirm] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const clearError = () => setError('');

  // ── Validation ──────────────────────────────────────────────────────────────
  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const loginValid = emailOk(loginEmail) && loginPassword.length >= 6;

  const registerValid =
    regName.trim().length >= 2 &&
    emailOk(regEmail) &&
    regPassword.length >= 6 &&
    regConfirm === regPassword;

  const regPasswordMismatch = regConfirm.length > 0 && regConfirm !== regPassword;
  const regPasswordTooShort = regPassword.length > 0 && regPassword.length < 6;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginValid) return;
    setLoading(true);
    clearError();
    try {
      await onLogin(loginEmail.trim(), loginPassword);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) setError('Email hoặc mật khẩu không đúng.');
      else if (status === 403) setError('Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ.');
      else setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerValid) return;
    setLoading(true);
    clearError();
    try {
      await onRegister(regName.trim(), regEmail.trim(), regPassword);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 409) setError('Email này đã được đăng ký. Hãy thử đăng nhập.');
      else if (status === 400) setError('Mật khẩu phải có ít nhất 6 ký tự.');
      else setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    clearError();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-scaleIn"
        style={{ boxShadow: '0 25px 60px -10px rgba(0,0,0,0.25)' }}
      >
        {/* ── Header gradient ──────────────────────────────────────────────── */}
        <div
          className="relative px-8 pt-8 pb-6"
          style={{ background: 'linear-gradient(135deg, #1a56db 0%, #7e3af2 100%)' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/20 hover:text-white transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 text-2xl font-bold text-white shadow-lg">
              G
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">GoReady</p>
              <h2 className="text-xl font-bold text-white">
                {tab === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
              </h2>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mt-5 flex gap-1 rounded-2xl bg-white/15 p-1">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                  tab === t
                    ? 'bg-white text-indigo-700 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {t === 'login' ? '🔑 Đăng nhập' : '✨ Đăng ký'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form body ────────────────────────────────────────────────────── */}
        <div className="px-8 py-6">
          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100 animate-fadeIn">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Login form ───────────────────────────────────────────────── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Email</span>
                <input
                  autoFocus
                  type="email"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); clearError(); }}
                  placeholder="ban@gmail.com"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Mật khẩu</span>
                <div className="relative">
                  <input
                    type={showLoginPwd ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <EyeIcon open={showLoginPwd} />
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={!loginValid || loading}
                className="mt-1 rounded-xl py-3 text-sm font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: loginValid && !loading
                    ? 'linear-gradient(135deg, #1a56db 0%, #7e3af2 100%)'
                    : undefined,
                  backgroundColor: !loginValid || loading ? '#94a3b8' : undefined,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Đang đăng nhập...
                  </span>
                ) : (
                  'Đăng nhập'
                )}
              </button>

              <p className="text-center text-xs text-slate-400">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => switchTab('register')} className="font-semibold text-indigo-600 hover:underline">
                  Đăng ký ngay
                </button>
              </p>
            </form>
          )}

          {/* ── Register form ─────────────────────────────────────────────── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Họ và tên</span>
                <input
                  autoFocus
                  type="text"
                  value={regName}
                  onChange={(e) => { setRegName(e.target.value); clearError(); }}
                  placeholder="Nguyễn Văn A"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Email</span>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => { setRegEmail(e.target.value); clearError(); }}
                  placeholder="ban@gmail.com"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Mật khẩu
                  {regPasswordTooShort && (
                    <span className="ml-2 font-normal text-red-500">ít nhất 6 ký tự</span>
                  )}
                </span>
                <div className="relative">
                  <input
                    type={showRegPwd ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition focus:bg-white focus:ring-2 ${
                      regPasswordTooShort
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <EyeIcon open={showRegPwd} />
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Xác nhận mật khẩu
                  {regPasswordMismatch && (
                    <span className="ml-2 font-normal text-red-500">không khớp</span>
                  )}
                </span>
                <div className="relative">
                  <input
                    type={showRegConfirm ? 'text' : 'password'}
                    value={regConfirm}
                    onChange={(e) => { setRegConfirm(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition focus:bg-white focus:ring-2 ${
                      regPasswordMismatch
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <EyeIcon open={showRegConfirm} />
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={!registerValid || loading}
                className="mt-1 rounded-xl py-3 text-sm font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: registerValid && !loading
                    ? 'linear-gradient(135deg, #1a56db 0%, #7e3af2 100%)'
                    : undefined,
                  backgroundColor: !registerValid || loading ? '#94a3b8' : undefined,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Đang tạo tài khoản...
                  </span>
                ) : (
                  'Tạo tài khoản'
                )}
              </button>

              <p className="text-center text-xs text-slate-400">
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => switchTab('login')} className="font-semibold text-indigo-600 hover:underline">
                  Đăng nhập
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
