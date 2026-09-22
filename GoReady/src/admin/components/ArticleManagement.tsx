import React from 'react';
import type { Article, ArticleCategory, ArticleStatus, Tour } from '../../types';
import { formatShortDate, uid } from '../../utils/format';
import { api } from '../../api';
import { onImageError } from '../../utils/image';
import { compressImage } from '../../utils/imageUpload';

interface ArticleManagementProps {
  articles: Article[];
  /** Để chọn tour gắn kèm bài viết. */
  tours: Tour[];
  onAdd: (article: Article) => void;
  onUpdate: (article: Article) => void;
  onDelete: (articleId: string) => void;
  onToggleHidden: (articleId: string) => void;
  onTogglePinned: (article: Article) => void;
  /** Tên admin đang đăng nhập, dùng làm tác giả mặc định của bài mới. */
  adminName: string;
}

const CATEGORIES: ArticleCategory[] = ['Tin tức', 'Cẩm nang du lịch'];

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=80';

/** Trạng thái hiển thị với người đọc: bài 'published' có `publishAt` ở tương lai là bài hẹn giờ. */
type ArticleState = 'draft' | 'scheduled' | 'published';

const articleState = (a: Pick<Article, 'status' | 'publishAt'>, now = Date.now()): ArticleState => {
  if (a.status === 'draft') return 'draft';
  return a.publishAt && new Date(a.publishAt).getTime() > now ? 'scheduled' : 'published';
};

const STATE_LABEL: Record<ArticleState, string> = { draft: 'Bản nháp', scheduled: 'Hẹn giờ', published: 'Đã đăng' };
const STATE_STYLE: Record<ArticleState, string> = {
  draft: 'bg-amber-50 text-amber-600',
  scheduled: 'bg-sky-50 text-sky-600',
  published: 'bg-emerald-50 text-emerald-600',
};

/** Cách đăng chọn trong form: lưu nháp, đăng ngay hoặc hẹn giờ. */
type PublishMode = 'draft' | 'now' | 'schedule';

type ArticleFormState = {
  title: string;
  category: ArticleCategory;
  author: string;
  coverImage: string;
  excerpt: string;
  content: string;
  publishMode: PublishMode;
  scheduleAt: string; // giá trị của <input type="datetime-local"> (giờ địa phương)
  pinned: boolean;
  relatedTourIds: string[];
};

const EMPTY_FORM: ArticleFormState = {
  title: '', category: 'Tin tức', author: '', coverImage: '', excerpt: '', content: '',
  publishMode: 'now', scheduleAt: '', pinned: false, relatedTourIds: [],
};

const isImageUrl = (value: string) => /^(https?:)?\/\//.test(value) || value.startsWith('/');

// ISO → "YYYY-MM-DDTHH:mm" theo giờ máy, đúng định dạng của datetime-local
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const MODE_OF_STATE: Record<ArticleState, PublishMode> = { draft: 'draft', scheduled: 'schedule', published: 'now' };

const articleToForm = (a: Article): ArticleFormState => ({
  title: a.title,
  category: a.category,
  author: a.author,
  coverImage: a.coverImage,
  excerpt: a.excerpt,
  content: a.content,
  publishMode: MODE_OF_STATE[articleState(a)],
  scheduleAt: toLocalInput(a.publishAt),
  pinned: Boolean(a.pinned),
  relatedTourIds: a.relatedTourIds ?? [],
});

const ArticleManagement: React.FC<ArticleManagementProps> = ({ articles, tours, onAdd, onUpdate, onDelete, onToggleHidden, onTogglePinned, adminName }) => {
  const [query, setQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<ArticleCategory | 'all'>('all');
  const [stateFilter, setStateFilter] = React.useState<ArticleState | 'all'>('all');
  const [editingArticle, setEditingArticle] = React.useState<Article | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<ArticleFormState>(EMPTY_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [tourQuery, setTourQuery] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<Article | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [urlDraft, setUrlDraft] = React.useState('');
  // Bumped every time the form opens/closes so an upload that finishes late never lands in a different form
  const formSession = React.useRef(0);

  const toursById = React.useMemo(() => new Map(tours.map((t) => [t.id, t])), [tours]);

  const filtered = articles.filter((a) => {
    const matchesQuery =
      a.title.toLowerCase().includes(query.toLowerCase()) || a.author.toLowerCase().includes(query.toLowerCase());
    return (
      matchesQuery &&
      (categoryFilter === 'all' || a.category === categoryFilter) &&
      (stateFilter === 'all' || articleState(a) === stateFilter)
    );
  });

  const tourOptions = tours.filter((t) => {
    const q = tourQuery.trim().toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q);
  });

  const resetImageUi = () => {
    formSession.current++;
    setUploading(false);
    setImageError(null);
    setUrlDraft('');
    setFormError(null);
    setTourQuery('');
  };

  const openAddForm = () => {
    resetImageUi();
    setEditingArticle(null);
    setForm({ ...EMPTY_FORM, author: adminName });
    setShowForm(true);
  };

  const openEditForm = (article: Article) => {
    resetImageUi();
    setEditingArticle(article);
    setForm(articleToForm(article));
    setShowForm(true);
  };

  const closeForm = () => {
    resetImageUi();
    setShowForm(false);
  };

  const patchForm = (patch: Partial<ArticleFormState>) => setForm((f) => ({ ...f, ...patch }));

  const toggleRelatedTour = (tourId: string) =>
    setForm((f) => ({
      ...f,
      relatedTourIds: f.relatedTourIds.includes(tourId) ? f.relatedTourIds.filter((id) => id !== tourId) : [...f.relatedTourIds, tourId],
    }));

  const addImageUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!isImageUrl(url)) {
      setImageError('URL ảnh phải bắt đầu bằng http://, https:// hoặc /');
      return;
    }
    patchForm({ coverImage: url });
    setUrlDraft('');
    setImageError(null);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again later
    if (!file) return;

    const session = formSession.current;
    setImageError(null);
    setUploading(true);
    try {
      const { url } = await api.uploadImage(await compressImage(file));
      if (formSession.current !== session) return; // the form was closed meanwhile
      patchForm({ coverImage: url });
    } catch (err) {
      if (formSession.current !== session) return;
      setImageError(err instanceof Error ? err.message : `Không tải được "${file.name}"`);
    }
    if (formSession.current !== session) return;
    setUploading(false);
  };

  /** status + publishAt theo cách đăng đã chọn; null nếu giờ hẹn không hợp lệ. */
  const resolvePublishing = (): { status: ArticleStatus; publishAt: string | null } | null => {
    if (form.publishMode === 'draft') return { status: 'draft', publishAt: null };
    if (form.publishMode === 'schedule') {
      const at = new Date(form.scheduleAt);
      if (!form.scheduleAt || Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return null;
      return { status: 'published', publishAt: at.toISOString() };
    }
    // Đăng ngay: bài đã đăng từ trước giữ nguyên ngày đăng cũ khi sửa
    const keepDate = editingArticle && articleState(editingArticle) === 'published' ? editingArticle.publishAt : null;
    return { status: 'published', publishAt: keepDate ?? new Date().toISOString() };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const publishing = resolvePublishing();
    if (!publishing) {
      setFormError('Chọn thời điểm hẹn giờ đăng ở tương lai.');
      return;
    }
    const coverImage = form.coverImage || editingArticle?.coverImage || DEFAULT_COVER;
    const fields = {
      title: form.title,
      category: form.category,
      author: form.author,
      coverImage,
      excerpt: form.excerpt,
      content: form.content,
      pinned: form.pinned,
      relatedTourIds: form.relatedTourIds,
      ...publishing,
    };

    if (editingArticle) {
      onUpdate({ ...editingArticle, ...fields });
    } else {
      const id = uid('article');
      onAdd({
        id,
        slug: id,
        hidden: false,
        createdAt: new Date().toISOString(),
        views: 0,
        ratingAvg: 0,
        ratingCount: 0,
        commentCount: 0,
        ...fields,
      });
    }
    closeForm();
  };

  const submitLabel = form.publishMode === 'draft' ? 'Lưu nháp' : form.publishMode === 'schedule' ? 'Hẹn giờ đăng' : editingArticle ? 'Lưu thay đổi' : 'Đăng bài';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc tác giả..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary sm:w-72 sm:shrink-0"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ArticleCategory | 'all')}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="all">Tất cả chuyên mục</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as ArticleState | 'all')}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="all">Mọi trạng thái</option>
            {(Object.keys(STATE_LABEL) as ArticleState[]).map((s) => (
              <option key={s} value={s}>
                {STATE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={openAddForm}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-card hover:bg-primary-600"
        >
          + Thêm bài viết
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-soft">
        {/* Các cột phụ có độ rộng cố định và gọn; cột Bài viết nhận phần còn lại, để nút thao tác luôn thấy được */}
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="whitespace-nowrap border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-3">Bài viết</th>
              <th className="w-[104px] px-3 py-3">Chuyên mục</th>
              <th className="w-[112px] px-3 py-3">Tác giả</th>
              <th className="w-[104px] px-3 py-3">Ngày đăng</th>
              <th className="w-[112px] px-3 py-3">Trạng thái</th>
              <th className="w-[92px] px-3 py-3">Tương tác</th>
              <th className="w-[96px] px-3 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const state = articleState(a);
              return (
                <tr key={a.id} className={a.hidden ? 'opacity-50' : ''}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <img src={a.coverImage} alt={a.title} onError={onImageError} className="aspect-video w-32 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <span className="line-clamp-2 font-semibold leading-snug text-slate-800" title={a.title}>
                          {a.pinned && <span title="Đang ghim" aria-label="Đang ghim">📌 </span>}
                          {a.title}
                        </span>
                        <span className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                          {a.relatedTourIds?.length ? `🧭 ${a.relatedTourIds.length} tour gắn kèm · ` : ''}
                          {a.excerpt}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-block rounded-lg bg-primary-50 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-primary-700">{a.category}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    <span className="line-clamp-2">{a.author || '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {state === 'draft' ? '—' : state === 'scheduled' && a.publishAt ? formatDateTime(a.publishAt) : formatShortDate(a.publishAt ?? a.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1.5 whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATE_STYLE[state]}`}>{STATE_LABEL[state]}</span>
                      <button
                        onClick={() => onToggleHidden(a.id)}
                        title="Bấm để ẩn/hiện bài viết"
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${a.hidden ? 'bg-slate-100 text-slate-500' : 'bg-sky-50 text-sky-600'}`}
                      >
                        {a.hidden ? 'Đang ẩn' : 'Đang hiện'}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    <div className="flex flex-col gap-0.5 whitespace-nowrap">
                      <span title="Lượt xem">👁 {(a.views ?? 0).toLocaleString('vi-VN')}</span>
                      <span title="Điểm đánh giá trung bình (số lượt chấm)">
                        ⭐ {a.ratingCount ? `${a.ratingAvg.toFixed(1)} (${a.ratingCount})` : '—'}
                      </span>
                      <span title="Bình luận đang hiện">💬 {a.commentCount ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {/* Xếp dọc để cột thao tác hẹp, luôn nằm trong khung bảng */}
                    <div className="ml-auto flex w-[72px] flex-col gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onTogglePinned(a)}
                        className={`rounded-lg border px-2 py-1 text-center text-xs font-semibold ${
                          a.pinned ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {a.pinned ? 'Bỏ ghim' : 'Ghim'}
                      </button>
                      <button onClick={() => openEditForm(a)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary">
                        Sửa
                      </button>
                      <button onClick={() => setDeleteTarget(a)} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  {articles.length === 0 ? 'Chưa có bài viết nào. Bấm "Thêm bài viết" để đăng bài đầu tiên.' : 'Không tìm thấy bài viết phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-card">
            <h2 className="font-heading text-lg font-bold text-slate-900">{editingArticle ? 'Sửa bài viết' : 'Thêm bài viết'}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Tiêu đề</span>
                <input required value={form.title} onChange={(e) => patchForm({ title: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Chuyên mục</span>
                <select value={form.category} onChange={(e) => patchForm({ category: e.target.value as ArticleCategory })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Tác giả</span>
                <input value={form.author} onChange={(e) => patchForm({ author: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>

              <div className="col-span-2 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500">Ảnh bìa</span>
                  <label className={`cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-50 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                    {uploading ? 'Đang tải...' : '+ Chọn ảnh từ máy'}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleFileInput} />
                  </label>
                </div>

                {form.coverImage ? (
                  <div className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                    <img src={form.coverImage} alt="Ảnh bìa" onError={onImageError} className="h-36 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => patchForm({ coverImage: '' })}
                      aria-label="Xoá ảnh bìa"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[10px] text-white hover:bg-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                    Chưa có ảnh bìa. Bài viết sẽ dùng ảnh mặc định nếu để trống.
                  </p>
                )}

                <div className="flex gap-2">
                  <input
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                    placeholder="Hoặc dán URL ảnh rồi bấm Thêm"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button type="button" onClick={addImageUrl} className="shrink-0 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary">
                    Thêm
                  </button>
                </div>

                {imageError && <p className="text-[11px] text-red-500">{imageError}</p>}
              </div>

              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Mô tả ngắn</span>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => patchForm({ excerpt: e.target.value })}
                  rows={2}
                  placeholder="Đoạn tóm tắt hiển thị trên thẻ bài viết ở Bảng tin..."
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Nội dung</span>
                <textarea
                  value={form.content}
                  onChange={(e) => patchForm({ content: e.target.value })}
                  rows={8}
                  placeholder="Nội dung đầy đủ của bài viết..."
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="col-span-2 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500">Tour gắn kèm</span>
                  <span className="text-[11px] text-slate-400">Hiện dưới bài viết kèm nút "Đặt ngay"</span>
                </div>
                {form.relatedTourIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.relatedTourIds.map((id) => (
                      <span key={id} className="flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-primary-700">
                        {toursById.get(id)?.name ?? 'Tour đã bị xoá'}
                        <button
                          type="button"
                          onClick={() => toggleRelatedTour(id)}
                          aria-label="Bỏ tour này"
                          className="grid h-4 w-4 place-items-center rounded-full text-[9px] hover:bg-primary-100"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  value={tourQuery}
                  onChange={(e) => setTourQuery(e.target.value)}
                  placeholder="Tìm tour theo tên hoặc điểm đến..."
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100">
                  {tourOptions.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50">
                      <input type="checkbox" checked={form.relatedTourIds.includes(t.id)} onChange={() => toggleRelatedTour(t.id)} className="accent-primary" />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{t.name}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {t.destination}
                        {t.hidden ? ' · đang ẩn' : ''}
                      </span>
                    </label>
                  ))}
                  {tourOptions.length === 0 && <p className="px-3 py-3 text-center text-xs text-slate-400">Không có tour phù hợp.</p>}
                </div>
              </div>

              <fieldset className="col-span-2 flex flex-col gap-2">
                <legend className="mb-1 text-xs font-semibold text-slate-500">Đăng bài</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['draft', 'Lưu nháp'],
                      ['now', 'Đăng ngay'],
                      ['schedule', 'Hẹn giờ'],
                    ] as [PublishMode, string][]
                  ).map(([mode, label]) => (
                    <label
                      key={mode}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-semibold ${
                        form.publishMode === mode ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input type="radio" name="publishMode" value={mode} checked={form.publishMode === mode} onChange={() => patchForm({ publishMode: mode })} className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
                {form.publishMode === 'schedule' && (
                  <input
                    type="datetime-local"
                    value={form.scheduleAt}
                    min={toLocalInput(new Date().toISOString())}
                    onChange={(e) => patchForm({ scheduleAt: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-primary"
                  />
                )}
                <p className="text-[11px] text-slate-400">
                  {form.publishMode === 'draft'
                    ? 'Bản nháp chỉ admin thấy, chưa hiện ở Bảng tin.'
                    : form.publishMode === 'schedule'
                      ? 'Bài tự hiện ở Bảng tin khi đến giờ hẹn.'
                      : 'Bài hiện ở Bảng tin ngay sau khi lưu.'}
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.pinned} onChange={(e) => patchForm({ pinned: e.target.checked })} className="accent-primary" />
                  📌 Ghim lên đầu Bảng tin
                </label>
              </fieldset>
            </div>
            {formError && <p className="mt-3 text-xs text-red-500">{formError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300">
                Huỷ
              </button>
              <button type="submit" disabled={uploading} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card hover:bg-primary-600 disabled:cursor-wait disabled:opacity-50">
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
            <h2 className="font-heading text-lg font-bold text-slate-900">Xoá bài viết?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Bạn có chắc muốn xoá <span className="font-semibold text-slate-700">{deleteTarget.title}</span>? Bình luận và đánh giá của bài cũng bị xoá. Hành động này không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300">
                Huỷ
              </button>
              <button
                onClick={() => {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-card hover:bg-red-600"
              >
                Xoá bài viết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManagement;
