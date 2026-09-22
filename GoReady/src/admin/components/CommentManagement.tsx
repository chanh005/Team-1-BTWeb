import React from 'react';
import type { ArticleComment } from '../../types';

interface CommentManagementProps {
  comments: ArticleComment[];
  onSetHidden: (commentId: string, hidden: boolean) => void;
  onDelete: (commentId: string) => void;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const Stars: React.FC<{ value: number }> = ({ value }) => (
  <span className="text-amber-400" aria-label={`${value} sao`}>
    {'★'.repeat(value)}
    <span className="text-slate-200">{'★'.repeat(5 - value)}</span>
  </span>
);

/** Kiểm duyệt bình luận người dùng để lại dưới bài viết Bảng tin: ẩn (có thể hiện lại) hoặc xoá hẳn. */
const CommentManagement: React.FC<CommentManagementProps> = ({ comments, onSetHidden, onDelete }) => {
  const [query, setQuery] = React.useState('');
  const [visibility, setVisibility] = React.useState<'all' | 'visible' | 'hidden'>('all');
  const [deleteTarget, setDeleteTarget] = React.useState<ArticleComment | null>(null);

  const filtered = comments.filter((c) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.content.toLowerCase().includes(q) ||
      (c.userName ?? '').toLowerCase().includes(q) ||
      (c.articleTitle ?? '').toLowerCase().includes(q);
    const matchesVisibility = visibility === 'all' || (visibility === 'hidden' ? c.hidden : !c.hidden);
    return matchesQuery && matchesVisibility;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo nội dung, người viết hoặc bài viết..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary sm:max-w-sm"
        />
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as typeof visibility)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="all">Tất cả bình luận</option>
          <option value="visible">Đang hiện</option>
          <option value="hidden">Đã ẩn</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((c) => (
          <div key={c.id} className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-soft ${c.hidden ? 'opacity-60' : ''}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-slate-800">{c.userName ?? 'Tài khoản đã xoá'}</span>
                  {c.userRating && <Stars value={c.userRating} />}
                  <span className="text-slate-400">· {formatDateTime(c.createdAt)}</span>
                  {c.hidden && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Đã ẩn</span>}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  trong bài <span className="font-semibold text-slate-500">{c.articleTitle ?? 'Bài viết đã xoá'}</span>
                </p>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-700">{c.content}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onSetHidden(c.id, !c.hidden)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
                >
                  {c.hidden ? 'Hiện lại' : 'Ẩn'}
                </button>
                <button onClick={() => setDeleteTarget(c)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                  Xoá
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-soft">
            {comments.length === 0 ? 'Chưa có bình luận nào.' : 'Không tìm thấy bình luận phù hợp.'}
          </p>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
            <h2 className="font-heading text-lg font-bold text-slate-900">Xoá bình luận?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Bình luận của <span className="font-semibold text-slate-700">{deleteTarget.userName ?? 'người dùng'}</span> sẽ bị xoá vĩnh viễn. Nếu chỉ muốn tạm che, hãy dùng "Ẩn".
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
                Xoá bình luận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentManagement;
