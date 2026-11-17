import React from 'react';
import { api, articleApi, type AdminActor } from '../../api';
import { fileToResizedDataUrl } from '../../utils/image';
import type { Article, ArticleInput, ArticleStatus } from '../../types';

// Form tạo / sửa bài viết. Nội dung là HTML (server làm sạch khi lưu): dùng nút chèn nhanh ở thanh công cụ.
const TITLE_MAX = 255;
const SUMMARY_MAX = 500;
const META_TITLE_RECOMMEND = 60;
const META_DESC_RECOMMEND = 160;

/** Bản rút gọn của slugify ở server, chỉ để gợi ý slug khi gõ tiêu đề (server vẫn quyết định cuối cùng). */
const toSlug = (text: string) =>
  text.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
const field = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary';
const box = 'rounded-2xl border border-slate-200 p-4';

interface ArticleEditorProps {
  actor: AdminActor;
  article: Article | null;
  onClose: () => void;
  onSaved: (article: Article) => void;
}

const ArticleEditor: React.FC<ArticleEditorProps> = ({ actor, article, onClose, onSaved }) => {
  const isEdit = article !== null;
  const [title, setTitle] = React.useState(article?.title ?? '');
  const [slug, setSlug] = React.useState(article?.slug ?? '');
  // Bài mới: slug theo tiêu đề cho đến khi admin tự sửa slug. Bài cũ: giữ slug để không hỏng link đã chia sẻ
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [summary, setSummary] = React.useState(article?.summary ?? '');
  const [content, setContent] = React.useState(article?.content ?? '');
  const [category, setCategory] = React.useState(article?.category ?? '');
  const [tags, setTags] = React.useState((article?.tags ?? []).join(', '));
  const [coverImage, setCoverImage] = React.useState(article?.coverImage ?? '');
  const [status, setStatus] = React.useState<ArticleStatus>(article?.status ?? 'published');
  const [showOnFeed, setShowOnFeed] = React.useState(article?.showOnFeed ?? true);
  const [isPinned, setIsPinned] = React.useState(article?.isPinned ?? false);
  const [metaTitle, setMetaTitle] = React.useState(article?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = React.useState(article?.metaDescription ?? '');
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const contentRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(toSlug(value));
  };

  /** Chèn đoạn HTML tại vị trí con trỏ trong ô nội dung */
  const insert = (snippet: string) => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    setContent(content.slice(0, start) + snippet + content.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const { url } = await api.uploadImage(dataUrl);
      setCoverImage(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ảnh');
    } finally {
      setUploading(false);
    }
  };

  const insertImage = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const { url } = await api.uploadImage(dataUrl);
      insert(`\n<img src="${url}" alt="">\n`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ảnh');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError('');
    const payload: ArticleInput = {
      title: title.trim(),
      content,
      summary: summary.trim(),
      category: category.trim() || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      coverImage: coverImage || null,
      status,
      showOnFeed,
      isPinned,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
    };
    // Sửa bài: luôn gửi slug hiện tại. Bài mới: chỉ gửi khi admin tự nhập, còn lại server tự sinh
    if (isEdit || (slugTouched && slug.trim())) payload.slug = slug.trim();

    setSaving(true);
    try {
      const saved = isEdit ? await articleApi.update(actor, article.id, payload) : await articleApi.create(actor, payload);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được bài viết');
    } finally {
      setSaving(false);
    }
  };

  const toolbar: { label: string; run: () => void }[] = [
    { label: 'H2', run: () => insert('\n<h2>Tiêu đề mục</h2>\n') },
    { label: 'H3', run: () => insert('\n<h3>Tiêu đề phụ</h3>\n') },
    { label: 'Đoạn', run: () => insert('\n<p>Nội dung đoạn văn…</p>\n') },
    { label: 'Danh sách', run: () => insert('\n<ul>\n  <li>Mục một</li>\n  <li>Mục hai</li>\n</ul>\n') },
    { label: 'Liên kết', run: () => insert('<a href="https://">chữ hiển thị</a>') },
    { label: 'Trích dẫn', run: () => insert('\n<blockquote>Trích dẫn…</blockquote>\n') },
  ];

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const serpUrl = `${siteOrigin}/#/cong-dong-du-lich/cam-nang/${slug || '…'}`;
  const serpTitle = metaTitle.trim() || title.trim() || 'Tiêu đề bài viết';
  const serpDesc = metaDescription.trim() || summary.trim() || 'Mô tả ngắn sẽ hiện ở đây…';
  const canSave = Boolean(title.trim() && content.trim() && slug.trim()) && !saving && !uploading;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={isEdit ? 'Sửa bài viết' : 'Viết bài mới'}>
      <div className="mx-auto my-4 max-w-5xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Sửa bài viết' : 'Viết bài mới'}</h2>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng">✕</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <label className="block">
              <span className={label}>Tiêu đề</span>
              <input value={title} maxLength={TITLE_MAX} onChange={(e) => onTitle(e.target.value)} className={`${field} h-11 text-base font-semibold`} placeholder="Ví dụ: Cẩm nang Đà Lạt mùa hoa 2026" />
            </label>

            <label className="block">
              <span className={label}>Slug (đường dẫn)</span>
              <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} className={field} placeholder="cam-nang-da-lat" />
              <span className="mt-1 block text-xs text-slate-400">Chỉ chữ thường không dấu và dấu gạch ngang. Đổi slug bài đã đăng sẽ làm link cũ không mở được.</span>
            </label>

            <label className="block">
              <span className={label}>Tóm tắt (hiện trên Feed)</span>
              <textarea value={summary} maxLength={SUMMARY_MAX} onChange={(e) => setSummary(e.target.value)} rows={2} className={field} placeholder="Để trống sẽ lấy đoạn đầu của nội dung" />
            </label>

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`${label} mr-2`}>Nội dung (HTML)</span>
                {toolbar.map((t) => (
                  <button key={t.label} type="button" onClick={t.run} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-sky-50">{t.label}</button>
                ))}
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-sky-50 disabled:opacity-50">
                  {uploading ? 'Đang tải ảnh…' : 'Ảnh'}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void insertImage(f); }} />
              </div>
              <textarea ref={contentRef} value={content} onChange={(e) => setContent(e.target.value)} rows={16}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
                placeholder="<h2>Mở đầu</h2>&#10;<p>Viết nội dung tại đây…</p>" />
              <span className="mt-1 block text-xs text-slate-400">Được phép: h2, h3, p, strong, em, ul, ol, li, blockquote, a, img. Các thẻ khác (kể cả script) sẽ bị xoá khi lưu.</span>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className={box}>
              <span className={label}>Trạng thái</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as ArticleStatus)} className={`${field} bg-white`}>
                <option value="published">Đã đăng</option>
                <option value="draft">Nháp (chỉ admin thấy)</option>
                <option value="archived">Lưu trữ (ẩn khỏi trang công khai)</option>
              </select>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={showOnFeed} onChange={(e) => setShowOnFeed(e.target.checked)} className="h-4 w-4 accent-primary" />
                Hiển thị trên Feed
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="h-4 w-4 accent-primary" />
                Ghim lên đầu Feed
              </label>
            </section>

            <section className={box}>
              <span className={label}>Chuyên mục và thẻ</span>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className={field} placeholder="Cẩm nang du lịch" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} placeholder="đà lạt, mùa đông (phân cách bằng dấu phẩy)" />
            </section>

            <section className={box}>
              <span className={label}>Ảnh đại diện</span>
              {coverImage ? (
                <div className="mt-2">
                  <img src={coverImage} alt="" className="aspect-video w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => setCoverImage('')} className="mt-2 text-xs font-semibold text-rose-600 hover:underline">Gỡ ảnh</button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Chưa có ảnh đại diện.</p>
              )}
              <label className="mt-2 inline-block cursor-pointer rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white">
                {uploading ? 'Đang tải…' : 'Chọn ảnh'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadCover(f); }} />
              </label>
            </section>

            <section className={box}>
              <span className={label}>Tối ưu SEO</span>
              <label className="mt-2 block">
                <span className="flex justify-between text-xs text-slate-500"><span>Meta title</span><span>{metaTitle.length}/{META_TITLE_RECOMMEND}</span></span>
                <input value={metaTitle} maxLength={255} onChange={(e) => setMetaTitle(e.target.value)} className={field} placeholder="Để trống sẽ dùng tiêu đề" />
              </label>
              <label className="mt-2 block">
                <span className="flex justify-between text-xs text-slate-500"><span>Meta description</span><span>{metaDescription.length}/{META_DESC_RECOMMEND}</span></span>
                <textarea value={metaDescription} maxLength={320} onChange={(e) => setMetaDescription(e.target.value)} rows={3} className={field} placeholder="Để trống sẽ dùng tóm tắt" />
              </label>
              <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3" aria-label="Xem trước kết quả tìm kiếm">
                <p className="text-[11px] text-slate-500">{serpUrl}</p>
                <p className="mt-0.5 truncate text-[15px] font-medium text-[#1a0dab]">{serpTitle}</p>
                <p className="line-clamp-2 text-xs text-slate-600">{serpDesc}</p>
                {(metaTitle.length > META_TITLE_RECOMMEND || serpTitle.length > META_TITLE_RECOMMEND) && (
                  <p className="mt-1 text-[11px] text-amber-700">Tiêu đề dài hơn {META_TITLE_RECOMMEND} ký tự có thể bị cắt trên Google.</p>
                )}
              </div>
            </section>
          </aside>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600">Hủy</button>
          <button type="button" disabled={!canSave} onClick={save} className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white disabled:opacity-40">
            {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Lưu bài viết'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;
