import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Banner from '../components/home/Banner';
import TourNoiBat from '../components/home/TourNoiBat';
import DiaDiemNoiBat from '../components/home/DiaDiemNoiBat';
import CTA from '../components/home/CTA';

// ==========================================================================
// TrangChu — trang chủ (route "/"), ghép các section theo đúng thứ tự:
// Header -> Banner -> Tour nổi bật -> Điểm đến nổi bật -> CTA -> Footer.
//
// Nhịp spacing dọc: mỗi section tự chịu trách nhiệm padding-block của mình
// (py-14 sm:py-20, riêng Banner có chiều cao cố định) nên các section liền
// nhau không cộng dồn margin và khoảng cách luôn đều bất kể thứ tự.
// Nền so le trắng / slate-50 / primary giữa các section để phân tách vùng
// nội dung mà không cần đường viền hay margin rời rạc.
// ==========================================================================

const TrangChu: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-body">
      <Header isLoggedIn={false} />
      <main>
        <Banner />
        <TourNoiBat />
        <DiaDiemNoiBat />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default TrangChu;
