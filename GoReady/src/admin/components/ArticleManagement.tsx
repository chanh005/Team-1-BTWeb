import React from 'react';
import { articleApi, type AdminActor } from '../../api';
import type { Article, ArticleStatus } from '../../types';
import ArticleEditor from './ArticleEditor';

// Quản lý bài viết cẩm nang: danh sách, bật/tắt hiển thị trên Feed và ghim nhanh, sửa, xoá.
const STATUS_LABEL: Record<ArticleStatus, { text: string; cls: string }> = {
  published: { text: 'Đã đăng', cls: 'bg-green-100 text-green-800' },
  draft: { text: 'Nháp', cls: 'bg-slate-100 text-slate-600' },
  archived: { text: 'Lưu trữ', cls: 'bg-amber-100 text-amber-800' },
};

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

interface ArticleManagementProps {
  actor: AdminActor;
}

const ArticleManagement: React.FC<ArticleManagementProps> = ({ actor }) => {
  const [items, setItems] = React.useState<Article[] | null>(null);
  const [loadError, setLoadError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<ArticleStatus | ''>('');
  const [editing, setEditing] = React.useState<Article | 'new' | null>(null);
  const [toDelete, setToDelete] = React.useState<Article | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoadError('');
    try {
      const res = await articleApi.listManage(actor, { search: search.trim() || undefined, status: status || undefined });
      setItems(res.items);
    } catch (e) {
      setLoadError(errorText(e, 'Không tải được danh sách bài viết'));
    }
  }, [actor, search, status]);

  // Tìm kiếm gõ tới đâu gọi tới đó sẽ nhiều request: chờ 300ms sau lần gõ cuối
  React.useEffect(() => {
    const timer = window.setTimeout(load, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const toggle = async (article: Article, key: 'showOnFeed' | 'isPinned') => {
    setBusyId(article.id);
    setNotice('');
    try {
      const patch = key === 'showOnFeed' ? { showOnFeed: !article.showOnFeed } : { isPinned: !article.isPinned };
      const updated = await articleApi.update(actor, article.id, patch);
      setItems((list) => list?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
    } catch (e) {
      setNotice(errorText(e, 'Không cập nhật được bài viết'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await articleApi.remove(actor, target.id);
      setItems((list) => list?.filter((x) => x.id !== target.id) ?? null);
    } catch (e) {
      setNotice(errorText(e, 'Không xoá được bài viết'));
    }
  };

  const th = 'px-4 py-3 text-left';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tiêu đề hoặc tóm tắt…"
          className="h-10 min-w-[220px] flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-primary"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ArticleStatus | '')}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="published">Đã đăng</option>
          <option value="draft">Nháp</option>
          <option value="archived">Lưu trữ</option>
        </select>
        <button type="button" onClick={() => setEditing('new')} className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-600">
          + Viết bài mới
        </button>
      </div>

      {notice && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {notice}
          <button type="button" onClick={() => setNotice('')} className="ml-3 font-semibold underline">Đóng</button>
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loadError ? (
          <div role="alert" className="p-6 text-center text-sm text-rose-700">
            <p>{loadError}</p>
            <button type="button" onClick={load} className="mt-3 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white">Thử lại</button>
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className={th}>Tiêu đề</th>
                <th className={th}>Chuyên mục</th>
                <th className={th}>Trạng thái</th>
                <th className={th}>Trên Feed</th>
                <th className={th}>Ghim</th>
                <th className={th}>Lượt xem</th>
                <th className={th}>Cập nhật</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items === null && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">Đang tải…</td></tr>
              )}
              {items?.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">Chưa có bài viết nào.</td></tr>
              )}
              {items?.map((a) => {
                const st = STATUS_LABEL[a.status];
                const busy = busyId === a.id;
                return (
                  <tr key={a.id} className="border-b border-slate-50 align-middle">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-400">/cam-nang/{a.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.text}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" disabled={busy} onClick={() => toggle(a, 'showOnFeed')} aria-pressed={a.showOnFeed}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${a.showOnFeed ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-500'}`}>
                        {a.showOnFeed ? 'Đang hiện' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" disabled={busy} onClick={() => toggle(a, 'isPinned')} aria-pressed={a.isPinned}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${a.isPinned ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 text-slate-500'}`}>
                        {a.isPinned ? 'Đã ghim' : 'Ghim'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.viewsCount}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(a.updatedAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {a.status === 'published' && (
                          <a href={`/#/cong-dong-du-lich/cam-nang/${a.slug}`} target="_blank" rel="noreferrer"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Xem</a>
                        )}
                        <button type="button" onClick={() => setEditing(a)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Sửa</button>
                        <button type="button" onClick={() => setToDelete(a)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Xoá</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ArticleEditor
          actor={actor}
          article={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Xoá bài viết?</h2>
            <p className="mt-2 text-sm text-slate-600">“{toDelete.title}” sẽ bị xoá vĩnh viễn và link công khai sẽ không còn hoạt động.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setToDelete(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Hủy</button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Xoá</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManagement;
