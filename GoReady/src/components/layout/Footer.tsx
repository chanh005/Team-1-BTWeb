import React from 'react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

// ==========================================================================
// Footer — dùng chung cho toàn bộ site GoReady. Sitemap import NAV_ITEMS từ
// cùng nguồn với Header (./navItems) nên luôn khớp chính xác, không thể lệch.
// ==========================================================================

const SOCIAL_LINKS = ['FB', 'IG', 'TT', 'YT'];

const Footer: React.FC = () => (
  <footer className="border-t border-slate-100 bg-white">
    <div className="container-px mx-auto grid gap-10 py-12 sm:grid-cols-3">
      {/* Cột 1: Logo + mô tả */}
      <div>
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-heading font-bold text-white shadow-card">
            G
          </span>
          <span className="font-heading text-lg font-bold text-slate-900">
            Go<span className="text-primary">Ready</span>
          </span>
        </Link>
        <p className="mt-3 max-w-xs text-sm text-slate-500">
          Nền tảng du lịch trọn gói thông minh — tìm kiếm, đặt tour và quản lý chuyến đi chỉ trong một nơi.
        </p>
      </div>

      {/* Cột 2: Sitemap — khớp chính xác 9 route của Header */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-800">Sitemap</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <Link to={item.path} className="transition-colors hover:text-primary">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Cột 3: Liên hệ + mạng xã hội */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-800">Liên hệ</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li>
            Email:{' '}
            <a href="mailto:hotro@goready.vn" className="hover:text-primary">
              hotro@goready.vn
            </a>
          </li>
          <li>
            Hotline:{' '}
            <a href="tel:19001080" className="hover:text-primary">
              1900 1080
            </a>
          </li>
        </ul>
        <div className="mt-4 flex gap-2">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s}
              href="#"
              aria-label={s}
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 transition-colors hover:bg-primary hover:text-white"
            >
              {s}
            </a>
          ))}
        </div>
      </div>
    </div>

    <div className="border-t border-slate-100 py-4">
      <div className="container-px mx-auto flex flex-col items-center gap-2 text-xs text-slate-400 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} GoReady. Đã đăng ký bản quyền.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-primary">
            Chính sách bảo mật
          </a>
          <a href="#" className="hover:text-primary">
            Điều khoản sử dụng
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
