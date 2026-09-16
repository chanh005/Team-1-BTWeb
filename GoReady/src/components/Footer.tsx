import React from 'react';

const Footer: React.FC = () => (
  <footer className="mt-16 border-t border-slate-100 bg-white">
    <div className="container-px mx-auto grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white font-heading font-bold">G</span>
          <span className="font-heading text-lg font-bold text-slate-900">
            Go<span className="text-primary">Ready</span>
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-500">Nền tảng du lịch trọn gói hiện đại — đồng hành cùng bạn từ tìm kiếm đến trải nghiệm sau chuyến đi.</p>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-800">Khám phá</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li>Tour Việt Nam</li>
          <li>Tour Quốc tế</li>
          <li>AI Smart Planner</li>
          <li>Ưu đãi hôm nay</li>
        </ul>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-800">Hỗ trợ</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li>Hotline 24/7: 1900 1080</li>
          <li>Trung tâm trợ giúp</li>
          <li>Câu hỏi thường gặp (FAQ)</li>
          <li>Liên hệ</li>
          <li>Chính sách</li>
          <li>Chính sách hoàn hủy</li>
          <li>Điều khoản dịch vụ</li>
        </ul>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-800">Kết nối</h4>
        <div className="flex gap-2">
          {['FB', 'IG', 'TT', 'YT'].map((s) => (
            <span key={s} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
    <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
      © {new Date().getFullYear()} GoReady. Trải nghiệm du lịch thông minh & trọn vẹn.
      {' · '}
      <a href="/admin.index.html" className="font-semibold text-slate-400 hover:text-primary">
        Đăng nhập trang quản trị
      </a>
    </div>
  </footer>
);

export default Footer;
