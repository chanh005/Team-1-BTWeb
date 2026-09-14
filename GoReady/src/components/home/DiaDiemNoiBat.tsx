import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_DIADIEM } from '../../data/diaDiem.mock';
import { khamPhaUrl } from '../../utils/khamPhaUrl';
import { placeholderImage } from '../../utils/placeholderImage';

// ==========================================================================
// DiaDiemNoiBat — section "Điểm đến nổi bật": carousel cuộn ngang, mỗi item
// chỉ gồm ảnh + TenDiaDiem + ThanhPho (đúng field bảng DiaDiem, không mô tả
// dài). Bấm vào 1 điểm đến -> /kham-pha?thanhpho=<ThanhPho>.
// ==========================================================================

const DiaDiemNoiBat: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-slate-50 py-14 sm:py-20">
      <div className="container-px mx-auto">
        <div className="mb-8">
          <h2 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">Điểm đến nổi bật</h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">Chạm để xem tour theo từng thành phố.</p>
        </div>

        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1">
          {MOCK_DIADIEM.map((d) => (
            <button
              key={d.MaDiaDiem}
              type="button"
              onClick={() => navigate(khamPhaUrl(d.ThanhPho))}
              className="group relative h-56 w-44 shrink-0 snap-start overflow-hidden rounded-2xl text-left shadow-soft transition hover:-translate-y-1 hover:shadow-card sm:h-64 sm:w-52"
            >
              <img
                src={placeholderImage(d.MaDiaDiem)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="font-heading text-base font-bold leading-snug">{d.TenDiaDiem}</p>
                <p className="text-xs text-white/80">{d.ThanhPho}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DiaDiemNoiBat;
