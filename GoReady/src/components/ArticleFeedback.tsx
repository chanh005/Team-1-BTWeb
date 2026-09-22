import React from 'react';
import type { AccountUser, ArticleFeedback as Feedback } from '../types';
import { api } from '../api';

interface ArticleFeedbackProps {
  articleId: string;
  /** Người dùng đang đăng nhập; null thì chỉ xem, bấm chấm sao/bình luận sẽ gọi `onRequireLogin`. */
  currentUser: AccountUser | null;
  onRequireLogin: () => void;
}

const MAX_LENGTH = 1000;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Đánh giá (1–5 sao, mỗi người một lần, chấm lại thì ghi đè) + bình luận dưới một bài viết Bảng tin.
 * Bình luận bị admin ẩn sẽ không hiện ở đây.
 */
const ArticleFeedback: React.FC<ArticleFeedbackProps> = ({ articleId, currentUser, onRequireLogin }) => {
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [hoverStar, setHoverStar] = React.useState(0);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const userId = currentUser?.id;

  const load = React.useCallback(async () => {
    try {
      setFeedback(await api.getArticleFeedback(articleId, userId));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được bình luận');
    }
  }, [articleId, userId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const explain = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    return message === 'locked' ? 'Tài khoản của bạn đang bị khoá.' : message || 'Có lỗi xảy ra, thử lại sau.';
  };

  const handleRate = async (rating: number) => {
    if (!currentUser) return onRequireLogin();
    setError(null);
    try {
      const summary = await api.rateArticle(articleId, currentUser.id, rating);
      setFeedback((f) => (f ? { ...f, ...summary } : f));
      load(); // the stars next to this user's comments change too
    } catch (err) {
      setError(explain(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return onRequireLogin();
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setError(null);
    try {
      const comment = await api.addArticleComment(articleId, currentUser.id, content);
      setFeedback((f) => (f ? { ...f, comments: [comment, ...f.comments] } : f));
      setDraft('');
    } catch (err) {
      setError(explain(err));
    }
    setSending(false);
  };

  if (loadError) return <p className="text-sm text-slate-400">{loadError}</p>;
  if (!feedback) return <p className="text-sm text-slate-400">Đang tải bình luận...</p>;

  const shownStars = hoverStar || feedback.myRating || 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-2xl font-bold text-slate-900">
            {feedback.ratingCount ? feedback.ratingAvg.toFixed(1) : '—'} <span className="text-amber-400">★</span>
          </p>
          <p className="text-xs text-slate-400">{feedback.ratingCount} lượt đánh giá</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-xs font-semibold text-slate-500">
            {feedback.myRating ? `Bạn đã chấm ${feedback.myRating} sao — bấm để đổi` : 'Bài viết này hữu ích với bạn?'}
          </span>
          <div className="flex" onMouseLeave={() => setHoverStar(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRate(star)}
                onMouseEnter={() => setHoverStar(star)}
                aria-label={`Chấm ${star} sao`}
                className={`px-0.5 text-2xl leading-none transition-colors ${star <= shownStars ? 'text-amber-400' : 'text-slate-200'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          onFocus={() => !currentUser && onRequireLogin()}
          rows={3}
          placeholder={currentUser ? 'Chia sẻ cảm nhận của bạn về bài viết...' : 'Đăng nhập để bình luận'}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            {draft.length}/{MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Đang gửi...' : 'Gửi bình luận'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>

      <div className="flex flex-col gap-3">
        <h3 className="font-heading text-base font-bold text-slate-900">Bình luận ({feedback.comments.length})</h3>
        {feedback.comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
              {(c.userName ?? '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-semibold text-slate-800">{c.userName ?? 'Người dùng'}</span>
                {c.userRating && <span className="text-amber-400">{'★'.repeat(c.userRating)}</span>}
                <span className="text-slate-400">{formatDateTime(c.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{c.content}</p>
            </div>
          </div>
        ))}
        {feedback.comments.length === 0 && <p className="text-sm text-slate-400">Chưa có bình luận nào. Hãy là người đầu tiên!</p>}
      </div>
    </section>
  );
};

export default ArticleFeedback;
