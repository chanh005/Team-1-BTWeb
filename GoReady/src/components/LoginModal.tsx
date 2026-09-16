import React from 'react';

interface LoginModalProps {
  onClose: () => void;
  onSubmit: (name: string, email: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');

  const canSubmit = name.trim().length > 1 && /^\S+@\S+\.\S+$/.test(email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(name.trim(), email.trim());
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card animate-scaleIn"
      >
        <h2 className="font-heading text-lg font-bold text-slate-900">Đăng nhập / Đăng ký</h2>
        <p className="mt-1 text-sm text-slate-500">Chỉ cần tên và email — bản demo, chưa cần mật khẩu.</p>

        <div className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500">Họ và tên</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@gmail.com"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300">
            Huỷ
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tiếp tục
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginModal;
