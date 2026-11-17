import React, { useState } from 'react';
import { communitySectionHref } from '../../config/communityRoute';

// Mục "Bài review chi tiết" — dựng theo wireframe, dữ liệu mẫu (sẽ nối API sau).
interface Reply {
  author: string;
  isAuthor?: boolean;
  text: string;
}
interface Comment {
  id: string;
  initials: string;
  author: string;
  time: string;
  text: string;
  helpful: number;
  replies: Reply[];
}

const COMMENTS: Comment[] = [
  {
    id: 'c1',
    initials: 'TMA',
    author: 'Trần Minh Anh',
    time: '2 giờ trước',
    text: 'Bé nhà mình cũng 3 tuổi, cáp treo có mang xe đẩy không ạ?',
    helpful: 12,
    replies: [{ author: 'Lê Hoàng Long', isAuthor: true, text: 'Được ạ, nhân viên hỗ trợ mang lên rất nhẹ nhàng.' }],
  },
  {
    id: 'c2',
    initials: 'PTM',
    author: 'Phạm Thị Mai',
    time: '1 ngày trước',
    text: 'Tour này có ưu đãi cho nhóm sinh viên đi tự túc không ạ?',
    helpful: 4,
    replies: [],
  },
];

const RELATED = ['Săn mây Tà Xùa 2N1Đ: chi phí thực tế', 'Phú Quốc cho nhóm bạn sinh viên'];

const pill = 'rounded-full border px-3 py-1.5 text-xs font-semibold transition';

const TourCard: React.FC = () => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tour trong bài review này</p>
    <div className="relative mt-3 flex h-36 items-center justify-center rounded-xl bg-sky-100 px-2 text-center text-xs text-slate-600">
      Ảnh điểm đến của tour GoReady
      <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-bold text-white">
        Lịch trình chuẩn như bài viết
      </span>
    </div>
    <h3 className="mt-3 text-base font-bold text-slate-900">Tour Đà Nẵng – Bà Nà – Hội An 3N2Đ</h3>
    <p className="mt-1 text-xs text-slate-500">Khởi hành hàng ngày · [Điểm]/5 ([N] đánh giá thực tế)</p>
    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
      Dùng voucher GoPoint giảm ngay [số tiền] khi đặt tour này
    </p>
    <div className="mt-3 flex items-end justify-between">
      <span className="text-xs text-slate-500">Giá trọn gói, không phí ẩn</span>
      <b className="text-lg text-primary">[Giá tour] / người</b>
    </div>
    <a
      href="#/explore"
      className="mt-3 block rounded-xl bg-primary py-3 text-center text-sm font-extrabold text-white hover:opacity-90"
    >
      XEM CHI TIẾT &amp; ĐẶT TOUR
    </a>
  </section>
);

export const CommunityReviewDetail: React.FC = () => {
  const [liked, setLiked] = useState(false);
  const [helpful, setHelpful] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [draft, setDraft] = useState('');
  const [comments, setComments] = useState(COMMENTS);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setComments([{ id: `c${Date.now()}`, initials: 'BẠN', author: 'Bạn', time: 'Vừa xong', text, helpful: 0, replies: [] }, ...comments]);
    setDraft('');
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a href={communitySectionHref('feed')} className="font-semibold text-primary hover:underline">
          ← Về Feed chính
        </a>
        <span className="text-slate-400">Cộng đồng › Review Đà Nẵng 3N2Đ cùng gia đình</span>
        <span className="ml-auto rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600">Bài đã xem gần đây ▾</span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">LHL</span>
            <div>
              <p className="text-sm font-bold text-slate-900">Lê Hoàng Long</p>
              <p className="text-xs text-slate-500">02/10/2026 · 5 phút đọc · Gia đình</p>
            </div>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-primary">Thổ địa Đà Nẵng</span>
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">Verified Tour</span>
            <button
              type="button"
              onClick={() => setFollowing(!following)}
              className={`ml-auto ${pill} ${following ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-700'}`}
            >
              {following ? 'Đang theo dõi' : 'Theo dõi'}
            </button>
          </div>

          <h2 className="text-2xl font-extrabold leading-snug text-slate-900">
            Kinh nghiệm thực tế đưa bé 3 tuổi đi Bà Nà Hills: lịch trình thảnh thơi, không phí ẩn
          </h2>

          <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
            <div className="relative flex h-56 items-center justify-center rounded-xl bg-sky-100 text-sm text-slate-600">
              Thư viện ảnh/video thực tế
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">Ảnh thực tế</span>
            </div>
            <div className="grid grid-rows-2 gap-2">
              <div className="flex items-center justify-center rounded-xl bg-sky-50 text-xs text-slate-500">Ảnh 2</div>
              <div className="flex items-center justify-center rounded-xl bg-slate-200 text-xs font-semibold text-slate-600">+3 ảnh · 1 video</div>
            </div>
          </div>

          <p className="text-[15px] italic text-slate-600">[Caption: 1–2 câu giới thiệu chuyến đi do tác giả viết]</p>
          <div className="space-y-2" aria-hidden>
            {[100, 94, 88, 97, 70, 92, 85, 60].map((w, i) => (
              <div key={i} className="h-2 rounded bg-slate-200" style={{ width: `${w}%` }} />
            ))}
          </div>
          <p className="text-sm font-semibold text-primary">#DuLịchGiaĐình #DaNang3N2Đ #BaNaHills #ReviewThatGoReady</p>

          <div className="flex flex-wrap gap-2 border-y border-slate-100 py-3">
            <button type="button" onClick={() => setLiked(!liked)} className={`${pill} ${liked ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-700'}`}>
              {liked ? '♥' : '♡'} Thả tim · {142 + (liked ? 1 : 0)}
            </button>
            <button type="button" onClick={() => setHelpful(!helpful)} className={`${pill} ${helpful ? 'border-primary bg-primary text-white' : 'border-sky-200 bg-sky-50 text-primary'}`}>
              Hữu ích · {86 + (helpful ? 1 : 0)}
            </button>
            <button type="button" onClick={() => setSaved(!saved)} className={`${pill} ${saved ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-700'}`}>
              {saved ? 'Đã lưu' : 'Lưu bài'}
            </button>
            <button type="button" className={`${pill} border-slate-200 text-slate-700`}>Chia sẻ</button>
            <button type="button" className={`${pill} ml-auto border-slate-200 text-slate-400`}>Báo cáo bài</button>
          </div>

          {/* Mobile: khối tour nằm trước bình luận */}
          <div className="lg:hidden">
            <TourCard />
          </div>

          <h3 className="text-lg font-bold text-slate-900">Bàn luận · {38 + comments.length - COMMENTS.length}</h3>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Viết bình luận, hỏi chi phí, xin kinh nghiệm…"
              className="h-11 flex-1 rounded-full border border-slate-300 px-4 text-sm"
            />
            <button type="button" onClick={send} className="rounded-full bg-primary px-5 text-sm font-bold text-white hover:opacity-90">
              Gửi
            </button>
          </div>

          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">{c.initials}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <b className="text-slate-900">{c.author}</b> <span className="text-xs text-slate-400">· {c.time}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">{c.text}</p>
                <p className="mt-1 flex gap-4 text-xs font-semibold text-slate-500">
                  <span>Trả lời</span>
                  <span>Hữu ích · {c.helpful}</span>
                </p>
                {c.replies.map((r, i) => (
                  <div key={i} className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
                    <b className="text-slate-900">{r.author}</b>{' '}
                    {r.isAuthor && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-primary">Tác giả</span>}
                    <p className="mt-1 text-slate-700">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="self-start text-sm font-semibold text-primary hover:underline">
            Xem thêm 36 bình luận
          </button>

          <h3 className="mt-2 text-lg font-bold text-slate-900">Bài review liên quan</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {RELATED.map((t) => (
              <a key={t} href={communitySectionHref('review')} className="overflow-hidden rounded-xl border border-slate-200 hover:shadow-card">
                <div className="h-24 bg-sky-100" />
                <p className="p-3 text-sm font-semibold text-slate-800">{t}</p>
              </a>
            ))}
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <TourCard />
        </aside>
      </div>
    </section>
  );
};

export default CommunityReviewDetail;
