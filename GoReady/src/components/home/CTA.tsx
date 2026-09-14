import React from 'react';
import { Link } from 'react-router-dom';

// ==========================================================================
// CTA — section kêu gọi hành động, đặt trước Footer. Nền tương phản (primary
// đặc) so với các section trắng/xám xung quanh để nổi bật, full-width.
// ==========================================================================

const CTA: React.FC = () => (
  <section className="bg-primary py-14 text-white sm:py-20">
    <div className="container-px mx-auto flex flex-col items-center gap-5 text-center">
      <h2 className="max-w-xl font-heading text-2xl font-bold sm:text-3xl">Bắt đầu khám phá chuyến đi của bạn</h2>
      <p className="max-w-lg text-sm text-white/85 sm:text-base">
        Hàng trăm tour trọn gói đang chờ — tìm điểm đến phù hợp với bạn ngay hôm nay.
      </p>
      <Link
        to="/kham-pha"
        className="rounded-full bg-white px-8 py-3 text-sm font-bold text-primary shadow-card transition hover:bg-cream sm:text-base"
      >
        Khám phá ngay
      </Link>
    </div>
  </section>
);

export default CTA;
