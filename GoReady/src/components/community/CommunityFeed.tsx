import React, { useMemo, useState } from 'react';
import { communitySectionHref } from '../../config/communityRoute';

// Mục "Feed chính" — dựng theo wireframe, dữ liệu mẫu (sẽ nối API sau).
type Sort = 'newest' | 'featured' | 'following';

interface FeedPost {
  id: string;
  initials: string;
  author: string;
  badge: string;
  verified: boolean;
  title: string;
  hashtags: string[];
  tags: string[]; // dùng để lọc: nhóm + điểm đến
  likes: number;
  helpful: number;
  comments: number;
  createdAt: number;
  following: boolean;
}

const FILTERS = ['Gia đình', 'Phượt', 'Sinh viên săn deal', 'Đà Nẵng', 'Phú Quốc'];

const SORTS: { id: Sort; label: string }[] = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'featured', label: 'Nổi bật' },
  { id: 'following', label: 'Đang theo dõi' },
];

const MOCK_POSTS: FeedPost[] = [
  {
    id: 'p1',
    initials: 'LHL',
    author: 'Lê Hoàng Long',
    badge: 'Thổ địa Đà Nẵng',
    verified: true,
    title: 'Kinh nghiệm thực tế đưa bé 3 tuổi đi Bà Nà Hills: lịch trình thảnh thơi, không phí ẩn',
    hashtags: ['#DuLịchGiaĐình', '#DaNang3N2Đ', '#BaNaHills'],
    tags: ['Gia đình', 'Đà Nẵng'],
    likes: 142,
    helpful: 86,
    comments: 38,
    createdAt: 3,
    following: true,
  },
  {
    id: 'p2',
    initials: 'NHN',
    author: 'Nguyễn Hoàng Nam',
    badge: 'Đại sứ GoReady',
    verified: false,
    title: 'Săn mây Tà Xùa 2N1Đ: đi đâu, ăn gì, chi phí thực tế bao nhiêu',
    hashtags: ['#TàXùa', '#PhượtTâyBắc', '#SănMây'],
    tags: ['Phượt'],
    likes: 510,
    helpful: 232,
    comments: 88,
    createdAt: 2,
    following: false,
  },
  {
    id: 'p3',
    initials: 'TK',
    author: 'Trần Khánh',
    badge: 'Lữ khách mới',
    verified: false,
    title: 'Phú Quốc 3N2Đ cho sinh viên: combo vé + khách sạn tiết kiệm gần 40%',
    hashtags: ['#PhúQuốc', '#SănDeal'],
    tags: ['Sinh viên săn deal', 'Phú Quốc'],
    likes: 54,
    helpful: 33,
    comments: 9,
    createdAt: 1,
    following: false,
  },
];

const TRENDING = [
  { tag: '#DaNang', count: 12 },
  { tag: '#GiaDinh', count: 9 },
  { tag: '#TayBac', count: 7 },
];

const FEATURED_GUIDES = [
  { initials: 'LHL', name: 'Lê Hoàng Long' },
  { initials: 'NHN', name: 'Nguyễn Hoàng Nam' },
];

const chip = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-[13px] transition ${
    active ? 'bg-primary font-semibold text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
  }`;

export const CommunityFeed: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('newest');

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = MOCK_POSTS.filter(
      (p) =>
        (!filter || p.tags.includes(filter)) &&
        (!q || `${p.title} ${p.hashtags.join(' ')} ${p.tags.join(' ')}`.toLowerCase().includes(q)),
    );
    if (sort === 'following') list = list.filter((p) => p.following);
    return [...list].sort((a, b) => (sort === 'featured' ? b.helpful - a.helpful : b.createdAt - a.createdAt));
  }, [query, filter, sort]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Feed chính</h2>
          <p className="mt-1 text-[15px] text-slate-500">Khám phá bài chia sẻ của cộng đồng</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm review, địa danh…"
          aria-label="Tìm review, địa danh"
          className="ml-auto h-[42px] w-full rounded-full border border-slate-300 px-4 text-sm text-slate-700 placeholder:text-slate-400 sm:w-64"
        />
      </div>

      {/* Bộ lọc + sắp xếp */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFilter(null)} className={chip(filter === null)}>
          Tất cả
        </button>
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(filter === f ? null : f)} className={chip(filter === f)}>
            {f}
          </button>
        ))}
        <span className="rounded-full border border-dashed border-slate-400 px-3.5 py-1.5 text-[13px] text-slate-600">
          + Thêm bộ lọc
        </span>
        <div className="ml-auto flex gap-1 rounded-full bg-slate-100 p-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
                sort === s.id ? 'bg-white font-bold text-primary shadow-sm' : 'font-semibold text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_270px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Banner thử thách */}
          <div className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-primary bg-sky-50 px-4 py-3.5">
            <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-primary text-xs font-extrabold text-white">
              GO
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-slate-900">#MuaHèGoReady · Chia sẻ chuyến đi mùa hè</p>
              <p className="text-[13px] text-primary">Đăng review có ảnh thật để nhận GoPoint và huy hiệu</p>
            </div>
            <a
              href={communitySectionHref('soan-bai')}
              className="ml-auto flex-none rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white hover:opacity-90"
            >
              Tham gia
            </a>
          </div>

          {/* Danh sách bài */}
          {posts.map((p) => (
            <article
              key={p.id}
              className="grid gap-4 rounded-2xl border border-slate-200 p-3.5 sm:grid-cols-[210px_1fr]"
            >
              <a
                href={communitySectionHref('review')}
                className="flex h-44 items-center justify-center rounded-xl bg-sky-100 px-2 text-center text-xs text-slate-600 sm:h-[170px]"
              >
                Ảnh thực tế (ảnh chính)
              </a>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {p.initials}
                  </span>
                  <b className="text-[13px] text-slate-800">{p.author}</b>
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-primary">{p.badge}</span>
                  {p.verified && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">Verified Tour</span>
                  )}
                </div>
                <h3 className="text-[17px] font-bold leading-snug text-slate-900">
                  <a href={communitySectionHref('review')} className="hover:text-primary">
                    {p.title}
                  </a>
                </h3>
                <p className="text-xs font-semibold text-primary">{p.hashtags.join(' ')}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-slate-200 px-2.5 py-1">♡ {p.likes}</span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-primary">
                    Hữu ích {p.helpful}
                  </span>
                  <span className="rounded-full border border-slate-200 px-2.5 py-1">💬 {p.comments}</span>
                  <span className="text-slate-500">Lưu · Chia sẻ</span>
                </div>
              </div>
            </article>
          ))}

          {posts.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
              Chưa có bài nào, hãy là người đầu tiên chia sẻ
            </p>
          )}
          <p className="text-center text-xs text-slate-400">
            Cuộn xuống để tải thêm · Dữ liệu mẫu — sẽ thay bằng bài thật khi nối server.
          </p>
        </div>

        {/* Cột phải */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="text-[15px] font-bold text-slate-900">Chia sẻ chuyến đi của bạn</p>
            <p className="mt-1 text-[13px] text-slate-600">
              Ảnh thật và tour đã đi giúp bài được gắn Verified và nhận GoPoint.
            </p>
            <a
              href={communitySectionHref('soan-bai')}
              className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white hover:opacity-90"
            >
              Bắt đầu viết
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-[15px] font-bold text-slate-900">Hashtag đang nổi</p>
            <ul className="mt-3 space-y-2 text-[13px]">
              {TRENDING.map((t) => (
                <li key={t.tag} className="flex justify-between">
                  <span className="font-semibold text-primary">{t.tag}</span>
                  <span className="text-slate-400">{t.count} bài</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-[15px] font-bold text-slate-900">Thổ địa nổi bật tuần này</p>
            <ul className="mt-3 space-y-3">
              {FEATURED_GUIDES.map((g) => (
                <li key={g.initials} className="flex items-center gap-2.5 text-[13px]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {g.initials}
                  </span>
                  <span className="font-semibold text-slate-800">{g.name}</span>
                  <span className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                    Theo dõi
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CommunityFeed;
