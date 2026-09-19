import React from 'react';

const NEWS_ITEMS = [
  {
    title: 'Top 5 điểm đến biển đảo hot nhất mùa hè này',
    excerpt: 'Từ Phú Quốc đến Nha Trang, khám phá những bãi biển đẹp nhất Việt Nam đang được săn đón.',
    tag: 'Tin tức',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=80',
  },
  {
    title: 'Ưu đãi tháng: Giảm đến 20% tour Đà Nẵng - Hội An',
    excerpt: 'Đặt tour ngay hôm nay để nhận ưu đãi đặc biệt cho các khởi hành trong quý này.',
    tag: 'Tin tức',
    image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=500&fit=crop&q=80',
  },
  {
    title: 'Cẩm nang chuẩn bị hành lý cho chuyến Trekking Sa Pa',
    excerpt: 'Danh sách vật dụng cần thiết và mẹo giữ ấm khi khám phá vùng núi phía Bắc.',
    tag: 'Cẩm nang du lịch',
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&h=500&fit=crop&q=80',
  },
  {
    title: 'Kinh nghiệm săn vé máy bay giá rẻ đi Tokyo',
    excerpt: 'Thời điểm vàng để đặt vé và mẹo tiết kiệm chi phí cho chuyến du lịch Nhật Bản.',
    tag: 'Cẩm nang du lịch',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=500&fit=crop&q=80',
  },
];

const NewsFeed: React.FC = () => (
  <main className="container-px mx-auto py-10">
    <h1 className="font-heading text-2xl font-bold text-slate-900">Bảng tin</h1>
    <p className="mt-1 text-sm text-slate-500">Tin tức mới nhất và cẩm nang du lịch từ GoReady.</p>

    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {NEWS_ITEMS.map((item) => (
        <article
          key={item.title}
          className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card"
        >
          <div className="h-36 overflow-hidden">
            <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <span className="w-max rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">{item.tag}</span>
            <h3 className="font-heading text-sm font-bold text-slate-900 line-clamp-2">{item.title}</h3>
            <p className="line-clamp-3 text-xs text-slate-500">{item.excerpt}</p>
          </div>
        </article>
      ))}
    </div>
  </main>
);

export default NewsFeed;
