import React from 'react';
import { useNavigate } from 'react-router-dom';
import { khamPhaUrl } from '../../utils/khamPhaUrl';

// ==========================================================================
// Banner — banner chính của trang chủ (/), ảnh nền lớn + tìm kiếm nhanh
// theo thành phố, điều hướng sang /kham-pha?thanhpho=...
// ==========================================================================

export interface BannerProps {
  /** Ảnh nền chủ đề du lịch; mặc định dùng ảnh Unsplash có sẵn của dự án. */
  imageUrl?: string;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=1080&fit=crop&q=80';

const Banner: React.FC<BannerProps> = ({ imageUrl = DEFAULT_IMAGE }) => {
  const [city, setCity] = React.useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(khamPhaUrl(city));
  };

  return (
    <section className="relative flex h-[420px] items-center overflow-hidden sm:h-[520px]">
      <img src={imageUrl} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover" />
      {/* Overlay tối nhẹ để chữ dễ đọc trên mọi vùng ảnh */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/45 to-slate-900/20" />

      <div className="container-px relative mx-auto text-white">
        <h1 className="max-w-2xl font-heading text-3xl font-bold leading-tight sm:text-5xl">Du lịch trọn gói thông minh</h1>
        <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">
          Tìm và đặt tour trọn gói phù hợp với bạn chỉ trong vài phút.
        </p>

        <form onSubmit={handleSearch} className="mt-7 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-card sm:flex-row">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Nhập thành phố bạn muốn đến"
            aria-label="Nhập thành phố bạn muốn đến"
            className="flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600"
          >
            Tìm kiếm
          </button>
        </form>
      </div>
    </section>
  );
};

export default Banner;
