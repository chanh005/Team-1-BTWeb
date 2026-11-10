import React from 'react';
import type { CommunityComment } from '../../types/community';
import { communityApi } from '../../services/communityApi';

interface CommunityCommentsProps {
  postId: string;
  authorId: string;
  currentUser: { id: string; email: string; name: string; role?: string } | null;
  onOpenLogin: () => void;
  onReportComment: (commentId: string, commentContent: string) => void;
  commentsCount: number;
  onCommentCountChange?: (count: number) => void;
}

export const CommunityComments: React.FC<CommunityCommentsProps> = ({
  postId,
  authorId,
  currentUser,
  onOpenLogin,
  onReportComment,
  commentsCount,
  onCommentCountChange,
}) => {
  const [comments, setComments] = React.useState<CommunityComment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<{ id: string; authorName: string } | null>(null);
  const [replyContent, setReplyContent] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Load comments
  const loadComments = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await communityApi.getComments(postId, 1, 100);
      setComments(data);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  React.useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Gửi bình luận cấp 1
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const newComment = await communityApi.createComment(
        postId,
        content.trim(),
        null,
        {
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.name,
        }
      );
      setComments((prev) => [...prev, newComment]);
      setContent('');
      if (onCommentCountChange) onCommentCountChange(commentsCount + 1);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi bình luận, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  // Gửi trả lời cấp 2
  const handleCreateReply = async (parentId: string) => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    if (!replyContent.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const newReply = await communityApi.createComment(
        postId,
        replyContent.trim(),
        parentId,
        {
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.name,
        }
      );

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newReply],
            };
          }
          return c;
        })
      );

      setReplyingTo(null);
      setReplyContent('');
      if (onCommentCountChange) onCommentCountChange(commentsCount + 1);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi phản hồi, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa bình luận
  const handleDeleteComment = async (commentId: string, parentId?: string | null) => {
    if (!currentUser) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;

    try {
      await communityApi.deleteComment(commentId, {
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
      });

      if (parentId) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: (c.replies || []).filter((r) => r.id !== commentId),
              };
            }
            return c;
          })
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      if (onCommentCountChange) onCommentCountChange(Math.max(0, commentsCount - 1));
    } catch (err: any) {
      alert(err.message || 'Không thể xóa bình luận');
    }
  };

  return (
    <section className="mt-10 border-t border-slate-100 pt-8" id="binh-luan">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>Bình luận</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
            {comments.length}
          </span>
        </h3>
      </div>

      {/* Form viết bình luận */}
      <form onSubmit={handleCreateComment} className="mb-8">
        {error && (
          <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-100">
            {currentUser ? (
              <div className="grid h-full w-full place-items-center bg-primary text-xs font-bold text-white">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            ) : (
              <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400 text-xs">
                👤
              </div>
            )}
          </div>

          <div className="flex-1">
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                currentUser
                  ? 'Chia sẻ ý kiến, đặt câu hỏi hoặc cảm nhận của bạn về chuyến đi...'
                  : 'Đăng nhập để tham gia bình luận và thảo luận cùng cộng đồng...'
              }
              onFocus={() => {
                if (!currentUser) onOpenLogin();
              }}
              className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />

            <div className="mt-2.5 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Danh sách bình luận */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="h-4 w-3/4 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-slate-400">
          <p className="text-sm">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => {
            const isPostAuthor = comment.userId === authorId;
            const isMyComment = currentUser && (currentUser.id === comment.userId || currentUser.email === (comment as any).userEmail);
            const isAdmin = currentUser?.role === 'admin';

            return (
              <div key={comment.id} className="space-y-3">
                {/* Bình luận Cấp 1 */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                    {comment.userAvatar ? (
                      <img src={comment.userAvatar} alt={comment.userName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-slate-200 text-xs font-bold text-slate-600">
                        {comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 rounded-2xl bg-slate-50/80 p-3.5 sm:p-4 border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{comment.userName}</span>
                        {isPostAuthor && (
                          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">
                            Tác giả
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Nút Xóa / Báo cáo */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {isMyComment || isAdmin ? (
                          <button
                            onClick={() => handleDeleteComment(comment.id, null)}
                            className="hover:text-rose-600 transition-colors"
                            title="Xóa bình luận"
                          >
                            Xóa
                          </button>
                        ) : (
                          <button
                            onClick={() => onReportComment(comment.id, comment.content)}
                            className="hover:text-slate-600 transition-colors"
                            title="Báo cáo bình luận này"
                          >
                            Báo cáo
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>

                    {/* Nút Trả lời */}
                    <div className="mt-2.5">
                      <button
                        onClick={() => {
                          if (!currentUser) {
                            onOpenLogin();
                            return;
                          }
                          setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, authorName: comment.userName });
                        }}
                        className="text-xs font-semibold text-primary hover:text-primary-700"
                      >
                        {replyingTo?.id === comment.id ? 'Hủy' : 'Trả lời'}
                      </button>
                    </div>

                    {/* Form trả lời Cấp 2 */}
                    {replyingTo?.id === comment.id && (
                      <div className="mt-3 border-t border-slate-200/60 pt-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Trả lời ${replyingTo.authorName}...`}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateReply(comment.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateReply(comment.id)}
                            disabled={submitting || !replyContent.trim()}
                            className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-50"
                          >
                            Gửi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Danh sách Trả lời Cấp 2 */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 space-y-2.5 border-l-2 border-slate-100 pl-4 sm:ml-12 sm:pl-6">
                    {comment.replies.map((reply) => {
                      const isReplyAuthor = reply.userId === authorId;
                      const isMyReply = currentUser && (currentUser.id === reply.userId || currentUser.email === (reply as any).userEmail);

                      return (
                        <div key={reply.id} className="flex gap-2.5">
                          <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                            {reply.userAvatar ? (
                              <img src={reply.userAvatar} alt={reply.userName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center bg-slate-200 text-[10px] font-bold text-slate-600">
                                {reply.userName ? reply.userName.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 rounded-2xl bg-white p-3 border border-slate-100 shadow-xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-800">{reply.userName}</span>
                                {isReplyAuthor && (
                                  <span className="rounded-full bg-primary-100 px-2 py-0.2 text-[9px] font-bold text-primary-800">
                                    Tác giả
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {new Date(reply.createdAt).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              {(isMyReply || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id, comment.id)}
                                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Xóa phản hồi"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>

                            <p className="mt-1 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CommunityComments;

