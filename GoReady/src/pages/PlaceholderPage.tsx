import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

// ==========================================================================
// PlaceholderPage — trang tạm cho 8 route còn lại (chưa xây dựng), vẫn dùng
// chung Header + Footer để chứng minh 2 component này tái sử dụng nguyên vẹn
// trên mọi trang, không chỉ trang chủ.
// ==========================================================================

interface PlaceholderPageProps {
  title?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title = 'Trang đang được xây dựng' }) => (
  <div className="flex min-h-screen flex-col bg-white font-body">
    <Header isLoggedIn={false} />
    <main className="container-px mx-auto flex flex-1 flex-col items-center justify-center py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-2xl">🚧</span>
      <h1 className="mt-5 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">Nội dung trang này sẽ sớm được hoàn thiện.</p>
    </main>
    <Footer />
  </div>
);

export default PlaceholderPage;
