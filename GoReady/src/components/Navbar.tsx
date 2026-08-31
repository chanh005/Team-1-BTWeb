import React from 'react';

interface NavbarProps {
  view: 'home' | 'trips';
  onNavigate: (view: 'home' | 'trips') => void;
  savedCount: number;
  compareCount: number;
  onOpenSaved: () => void;
  onOpenAi: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ view, onNavigate, savedCount, compareCount, onOpenSaved, onOpenAi }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="container-px mx-auto flex h-16 items-center justify-between gap-4">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white text-lg font-heading font-bold shadow-card">G</span>
          <span className="font-heading text-xl font-bold text-slate-900">
            Go<span className="text-primary">Ready</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1 rounded-full bg-slate-100 p-1 text-sm font-medium">
          <button
            onClick={() => onNavigate('home')}
            className={`rounded-full px-4 py-2 transition-colors ${view === 'home' ? 'bg-primary text-white shadow-card' : 'text-slate-600 hover:text-primary'}`}
          >
            Khám phá Tour
          </button>
          <button
            onClick={() => onNavigate('trips')}
            className={`rounded-full px-4 py-2 transition-colors ${view === 'trips' ? 'bg-primary text-white shadow-card' : 'text-slate-600 hover:text-primary'}`}
          >
            Chuyến đi của tôi
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenAi}
            className="hidden sm:flex items-center gap-2 rounded-full border border-accent-dark/40 bg-accent/20 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-accent/40 transition-colors"
          >
            <span aria-hidden>✨</span> AI Lập Lịch Trình
          </button>
          <button
            onClick={onOpenSaved}
            className="relative flex items-center gap-2 rounded-full border border-slate-200 px-3 sm:px-4 py-2 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
          >
            <span aria-hidden>♡</span>
            <span className="hidden sm:inline">Đã lưu</span>
            {(savedCount > 0 || compareCount > 0) && (
              <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <nav className="flex md:hidden items-center gap-1 border-t border-slate-100 bg-white px-4 py-2 text-sm font-medium">
        <button
          onClick={() => onNavigate('home')}
          className={`flex-1 rounded-full px-3 py-1.5 text-center transition-colors ${view === 'home' ? 'bg-primary text-white' : 'text-slate-600'}`}
        >
          Khám phá
        </button>
        <button
          onClick={() => onNavigate('trips')}
          className={`flex-1 rounded-full px-3 py-1.5 text-center transition-colors ${view === 'trips' ? 'bg-primary text-white' : 'text-slate-600'}`}
        >
          Chuyến đi
        </button>
        <button onClick={onOpenAi} className="flex-1 rounded-full px-3 py-1.5 text-center text-primary">
          ✨ AI
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
