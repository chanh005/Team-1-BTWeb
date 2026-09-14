import React from 'react';
import { useNavigate } from 'react-router-dom';
import TourCard from './TourCard';
import { featuredTours } from '../../data/tourNoiBat.mock';
import { khamPhaUrl } from '../../utils/khamPhaUrl';

// ==========================================================================
// TourNoiBat — section "Tour nổi bật": grid trên desktop/tablet, carousel
// cuộn ngang (scroll-snap) trên mobile. Chưa có route chi tiết tour trong 9
// route hiện có, nên "Xem chi tiết" tạm điều hướng sang /kham-pha lọc theo
// thành phố của tour — dễ dàng thay bằng route chi tiết thật sau này.
// ==========================================================================

const TourNoiBat: React.FC = () => {
  const navigate = useNavigate();

  const handleViewDetail = (thanhPho: string) => navigate(khamPhaUrl(thanhPho));

  return (
    <section className="container-px mx-auto py-14 sm:py-20">
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">Tour nổi bật</h2>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">Những hành trình được đặt nhiều nhất tại GoReady.</p>
      </div>

      {/* Mobile: carousel cuộn ngang */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:hidden">
        {featuredTours.map((t) => (
          <div key={t.MaTour} className="w-[78%] shrink-0 snap-start">
            <TourCard
              MaTour={t.MaTour}
              TenTour={t.TenTour}
              Gia={t.Gia}
              ThoiGian={t.ThoiGian}
              TenDiaDiem={t.TenDiaDiem}
              onViewDetail={() => handleViewDetail(t.ThanhPho)}
            />
          </div>
        ))}
      </div>

      {/* Tablet/desktop: grid */}
      <div className="hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {featuredTours.map((t) => (
          <TourCard
            key={t.MaTour}
            MaTour={t.MaTour}
            TenTour={t.TenTour}
            Gia={t.Gia}
            ThoiGian={t.ThoiGian}
            TenDiaDiem={t.TenDiaDiem}
            onViewDetail={() => handleViewDetail(t.ThanhPho)}
          />
        ))}
      </div>
    </section>
  );
};

export default TourNoiBat;
