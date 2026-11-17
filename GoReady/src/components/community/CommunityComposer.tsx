import React, { useEffect, useRef, useState } from 'react';
import { communitySectionHref } from '../../config/communityRoute';
import { communityApi, type CreatePostPayload, type EligibleBooking } from '../../services/communityApi';
import { useTravelSummary } from '../../hooks/useTravelSummary';
import type { AccountUser } from '../../types';

// Mục "Soạn thảo bài viết". Gắn tour = chọn một booking đã hoàn thành của chính người dùng + chấm sao => bài review "Verified Tour".
const MAX_IMG = 5;
const MAX_VID = 2;
const TEMPLATE = '## Lý do đi\n\n## Lịch trình\n\n## Chi phí\n\n## Mẹo\n';
const GROUPS: { id: CreatePostPayload['group']; label: string }[] = [
  { id: 'family', label: 'Nghỉ dưỡng gia đình' },
  { id: 'backpack', label: 'Phượt & Khám phá' },
  { id: 'deal', label: 'Săn Deal & Tiết kiệm' },
  { id: 'student', label: 'Sinh viên & Giới trẻ' },
];

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

/** Đổi cú pháp markdown đơn giản của khung soạn sang HTML (server sẽ sanitize lại). */
function toHtml(md: string): string {
  const out: string[] = [];
  let list = false;
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };
  for (const raw of md.replace(/<\/?u>/g, '').split('\n')) {
    const line = raw.trimEnd();
    if (/^- /.test(line)) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    closeList();
    if (!line.trim()) continue;
    if (line.startsWith('## ')) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith('# ')) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith('> ')) out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('');
}

export const CommunityComposer: React.FC<{ currentUser: AccountUser | null }> = ({ currentUser }) => {
  const auth = currentUser ? { id: currentUser.id, email: currentUser.email } : null;
  const { refetch } = useTravelSummary(auth);
  const [bookings, setBookings] = useState<EligibleBooking[]>([]);
  const [bookingsError, setBookingsError] = useState('');
  const [rating, setRating] = useState(0);
  const [group, setGroup] = useState<CreatePostPayload['group']>('family');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [tour, setTour] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);
  const [note, setNote] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);

  const userId = currentUser?.id;
  const userEmail = currentUser?.email;
  useEffect(() => {
    if (!userId || !userEmail) return;
    let alive = true;
    communityApi
      .getEligibleBookings({ id: userId, email: userEmail })
      .then((b) => alive && setBookings(b))
      .catch((e: Error) => alive && setBookingsError(e.message));
    return () => { alive = false; };
  }, [userId, userEmail]);

  const submit = async () => {
    if (!auth) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload: CreatePostPayload = {
        title: title.trim(),
        contentHtml: toHtml(content),
        excerpt: caption.trim() || undefined,
        group,
        hashtags: tags,
        ...(tour ? { bookingId: tour, rating } : {}),
      };
      await communityApi.createPost(auth, payload);
      await refetch();
      window.location.hash = communitySectionHref('ho-so');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Không gửi được bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const images = files.filter((f) => f.type.startsWith('image/'));
  const videos = files.filter((f) => f.type.startsWith('video/'));

  const wrap = (before: string, after = before) => {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    setContent(content.slice(0, s) + before + content.slice(s, e) + after + content.slice(e));
    el.focus();
  };
  const prefix = (p: string) => setContent(content + (content && !content.endsWith('\n') ? '\n' : '') + p);

  const tools: { label: string; run: () => void; cls?: string }[] = [
    { label: 'B', run: () => wrap('**'), cls: 'font-bold' },
    { label: 'I', run: () => wrap('*'), cls: 'italic' },
    { label: 'U', run: () => wrap('<u>', '</u>'), cls: 'underline' },
    { label: 'H1', run: () => prefix('# ') },
    { label: 'H2', run: () => prefix('## ') },
    { label: 'Trích dẫn', run: () => prefix('> ') },
    { label: 'Danh sách', run: () => prefix('- ') },
    { label: 'Chèn mẫu khung review', run: () => setContent(content + (content ? '\n' : '') + TEMPLATE) },
  ];

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    let skipped = false;
    for (const f of Array.from(list)) {
      const img = f.type.startsWith('image/');
      const vid = f.type.startsWith('video/');
      const count = next.filter((x) => x.type.startsWith(img ? 'image/' : 'video/')).length;
      if ((img && count < MAX_IMG) || (vid && count < MAX_VID)) next.push(f);
      else skipped = true;
    }
    setFiles(next);
    setNote(skipped ? `Chỉ nhận tối đa ${MAX_IMG} ảnh và ${MAX_VID} video.` : '');
  };

  const addTag = () => {
    const t = '#' + tagInput.trim().replace(/^#/, '').replace(/\s+/g, '');
    if (t.length > 1 && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const now = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const canSubmit = Boolean(auth && title.trim() && content.trim() && (!tour || rating >= 1) && !submitting);
  const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const box = 'rounded-2xl border border-slate-200 p-4';

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a href={communitySectionHref('feed')} className="font-semibold text-primary hover:underline">← Về Feed chính</a>
        <span className="text-slate-400">Cộng đồng › Soạn thảo bài viết</span>
        <span className="ml-auto text-xs text-slate-400">{savedAt ? `Tự lưu lúc ${savedAt}` : 'Chưa lưu'}</span>
        <span className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600">Bản nháp của tôi (2)</span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Soạn thảo bài viết</h2>
            <p className="mt-1 text-[15px] text-slate-500">Chia sẻ trải nghiệm thật, nhận GoPoint khi bài được duyệt</p>
          </div>
          <label className="block">
            <span className={label}>Tiêu đề</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề ngắn gọn, thu hút" className="mt-1 h-12 w-full rounded-xl border border-slate-300 px-4 text-base font-semibold" />
          </label>
          <label className="block">
            <span className={label}>Caption</span>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Viết 1–2 câu giới thiệu chuyến đi" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm" />
          </label>

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
              {tools.map((t) => (
                <button key={t.label} type="button" onClick={t.run} className={`rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs hover:bg-sky-50 ${t.cls ?? 'font-semibold'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {preview ? (
              <pre className="min-h-[280px] whitespace-pre-wrap p-4 font-sans text-sm text-slate-800">{content || 'Chưa có nội dung.'}</pre>
            ) : (
              <textarea ref={ta} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Viết nội dung bài review tại đây…" className="min-h-[280px] w-full resize-y p-4 text-sm outline-none" />
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <section className={box}>
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-bold text-slate-900">Ảnh và video</p>
              <p className="text-xs text-slate-500">Ảnh {images.length}/{MAX_IMG} · Video {videos.length}/{MAX_VID}</p>
            </div>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 p-5 text-center"
            >
              <span className="text-sm font-semibold text-slate-700">Kéo thả ảnh hoặc video vào đây</span>
              <span className="text-xs text-slate-400">Tối đa 5 ảnh, 2 video · JPG, PNG, MP4</span>
              <span className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white">Tải ảnh lên</span>
              <input type="file" multiple accept="image/jpeg,image/png,video/mp4" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
            {note && <p className="mt-2 text-xs text-rose-600">{note}</p>}
            {files.length > 0 && <p className="mt-2 text-xs text-amber-700">Lưu ý: ảnh/video chưa được gửi kèm bài ở phiên bản này.</p>}
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                    <span className="truncate">{f.type.startsWith('video/') ? '🎬' : '🖼️'} {f.name}</span>
                    <button type="button" aria-label="Xóa" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-auto text-slate-400 hover:text-rose-600">×</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={box}>
            <p className="text-[15px] font-bold text-slate-900">Tour GoReady đã đi</p>
            <select value={tour} onChange={(e) => { setTour(e.target.value); setRating(0); }} disabled={!auth} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600">
              <option value="">{bookings.length ? 'Chọn từ lịch sử đặt của bạn' : 'Không gắn tour (bài thường)'}</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>{b.tourName} · {b.bookingCode}</option>)}
            </select>
            {bookingsError && <p className="mt-2 text-xs text-rose-600">{bookingsError}</p>}
            {auth && !bookingsError && bookings.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">Bạn chưa có chuyến đi nào đã hoàn thành để gắn.</p>
            )}
            {tour && (
              <div className="mt-3" role="radiogroup" aria-label="Chấm sao cho tour">
                <p className="text-xs font-semibold text-slate-600">Chấm sao (bắt buộc)</p>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sao`} onClick={() => setRating(n)} className={`text-2xl leading-none ${n <= rating ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">Gắn huy hiệu Verified Tour và nhận GoPoint sau khi bài được duyệt.</p>
          </section>

          <section className={box}>
            <p className="text-[15px] font-bold text-slate-900">Nhóm, địa danh và hashtag</p>
            <select aria-label="Nhóm bài viết" value={group} onChange={(e) => setGroup(e.target.value as CreatePostPayload['group'])} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600">
              {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Thêm địa danh: Đà Nẵng, Bà Nà Hills…" className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
              {tags.map((t) => (
                <button key={t} type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="rounded-full bg-sky-50 px-2.5 py-1 text-primary" title="Bấm để xóa">{t}</button>
              ))}
              {!tags.includes('#GiaDinh') && (
                <button type="button" onClick={() => setTags([...tags, '#GiaDinh'])} className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-slate-500">Gợi ý: #GiaDinh</button>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">Bài sẽ được quét tự động và chờ admin duyệt trước khi hiện ở Feed chính.</p>
        {!auth && <p className="text-xs font-semibold text-rose-600">Vui lòng đăng nhập để gửi bài.</p>}
        {submitError && <p role="alert" className="text-xs font-semibold text-rose-600">{submitError}</p>}
        <button type="button" onClick={() => setPreview(!preview)} className="ml-auto rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">{preview ? 'Quay lại soạn' : 'Xem trước'}</button>
        <button type="button" onClick={() => setSavedAt(now())} className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary">Lưu nháp</button>
        <button type="button" disabled={!canSubmit} onClick={submit} className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-white disabled:opacity-40">{submitting ? 'Đang gửi…' : 'Gửi duyệt'}</button>
      </div>
    </section>
  );
};

export default CommunityComposer;
