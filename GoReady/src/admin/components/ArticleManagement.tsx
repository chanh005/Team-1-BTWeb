import React from 'react';
import type { Article, ArticleCategory } from '../../types';
import { formatShortDate, uid } from '../../utils/format';
import { api } from '../../api';
import { onImageError } from '../../utils/image';
import { compressImage } from '../../utils/imageUpload';

interface ArticleManagementProps {
  articles: Article[];
  onAdd: (article: Article) => void;
  onUpdate: (article: Article) => void;
  onDelete: (articleId: string) => void;
  onToggleHidden: (articleId: string) => void;
  /** Tên admin đang đăng nhập, dùng làm tác giả mặc định của bài mới. */
  adminName: string;
}

const CATEGORIES: ArticleCategory[] = ['Tin tức', 'Cẩm nang du lịch'];

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=80';

type ArticleFormState = {
  title: string;
  category: ArticleCategory;
  author: string;
  coverImage: string;
  excerpt: string;
  content: string;
};

const isImageUrl = (value: string) => /^(https?:)?\/\//.test(value) || value.startsWith('/');

const articleToForm = (a: Article): ArticleFormState => ({
  title: a.title,
  category: a.category,
  author: a.author,
  coverImage: a.coverImage,
  excerpt: a.excerpt,
  content: a.content,
});

const ArticleManagement: React.FC<ArticleManagementProps> = ({ articles, onAdd, onUpdate, onDelete, onToggleHidden, adminName }) => {
  const [query, setQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<ArticleCategory | 'all'>('all');
  const [editingArticle, setEditingArticle] = React.useState<Article | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<ArticleFormState>({ title: '', category: 'Tin tức', author: '', coverImage: '', excerpt: '', content: '' });
  const [deleteTarget, setDeleteTarget] = React.useState<Article | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [urlDraft, setUrlDraft] = React.useState('');
  // Bumped every time the form opens/closes so an upload that finishes late never lands in a different form
  const formSession = React.useRef(0);

  const filtered = articles.filter((a) => {
    const matchesQuery =
      a.title.toLowerCase().includes(query.toLowerCase()) || a.author.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (categoryFilter === 'all' || a.category === categoryFilter);
  });

  const resetImageUi = () => {
    formSession.current++;
    setUploading(false);
    setImageError(null);
    setUrlDraft('');
  };

  const openAddForm = () => {
    resetImageUi();
    setEditingArticle(null);
    setForm({ title: '', category: 'Tin tức', author: adminName, coverImage: '', excerpt: '', content: '' });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const coverImage = form.coverImage || editingArticle?.coverImage || DEFAULT_COVER;

    if (editingArticle) {
      onUpdate({
        ...editingArticle,
        title: form.title,
        category: form.category,
        author: form.author,
        coverImage,
        excerpt: form.excerpt,
        content: form.content,
      });
    } else {
      const id = uid('article');
      onAdd({
        id,
        slug: id,
        title: form.title,
        category: form.category,
        author: form.author,
        coverImage,
        excerpt: form.excerpt,
        content: form.content,
        hidden: false,
        createdAt: new Date().toISOString(),
      });
    }
    closeForm();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc tác giả..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary sm:max-w-xs"
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
        </div>
        <button
          onClick={openAddForm}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-card hover:bg-primary-600"
        >
          + Thêm bài viết
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-soft">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Bài viết</th>
              <th className="px-4 py-3">Chuyên mục</th>
              <th className="px-4 py-3">Tác giả</th>
              <th className="px-4 py-3">Ngày đăng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <tr key={a.id} className={a.hidden ? 'opacity-50' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={a.coverImage} alt={a.title} onError={onImageError} className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <span className="line-clamp-1 max-w-[260px] font-semibold text-slate-800">{a.title}</span>
                      <span className="line-clamp-1 max-w-[260px] text-[11px] text-slate-400">{a.excerpt}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">{a.category}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.author || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{formatShortDate(a.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleHidden(a.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      a.hidden ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {a.hidden ? 'Đang ẩn' : 'Đang hiện'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEditForm(a)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary">
                      Sửa
                    </button>
                    <button onClick={() => setDeleteTarget(a)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
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
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300">
                Huỷ
              </button>
              <button type="submit" disabled={uploading} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card hover:bg-primary-600 disabled:cursor-wait disabled:opacity-50">
                {editingArticle ? 'Lưu thay đổi' : 'Đăng bài'}
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
              Bạn có chắc muốn xoá <span className="font-semibold text-slate-700">{deleteTarget.title}</span>? Hành động này không thể hoàn tác.
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
