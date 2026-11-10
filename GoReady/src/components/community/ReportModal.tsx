import React from 'react';
import { COMMUNITY_CONFIG } from '../../config/community';
import { communityApi } from '../../services/communityApi';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment';
  targetId: string;
  targetTitle?: string;
  currentUser: { id: string; email: string; name: string } | null;
  onOpenLogin: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  currentUser,
  onOpenLogin,
}) => {
  const [selectedReason, setSelectedReason] = React.useState<string>(COMMUNITY_CONFIG.REJECT_REASONS[0]);
  const [customReason, setCustomReason] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    const finalReason = selectedReason.startsWith('Khác') ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setError('Vui lòng cung cấp lý do báo cáo vi phạm');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await communityApi.createReport(
        targetType,
        targetId,
        finalReason,
        {
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.name,
        }
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Gửi báo cáo thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600">
              🚩
            </span>
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Báo cáo vi phạm {targetType === 'post' ? 'bài viết' : 'bình luận'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {targetTitle && (
          <p className="mt-3 text-xs text-slate-500 italic line-clamp-1">
            Nội dung: "{targetTitle}"
          </p>
        )}

        {success ? (
          <div className="my-6 rounded-xl bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">
            ✓ Cảm ơn bạn! Ban quản trị GoReady đã tiếp nhận báo cáo và sẽ kiểm tra trong thời gian sớm nhất.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Chọn lý do vi phạm:
              </label>
              <div className="space-y-2">
                {COMMUNITY_CONFIG.REJECT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-700 hover:border-primary/50 hover:bg-primary-50/20"
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason.startsWith('Khác') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả chi tiết vi phạm:
                </label>
                <textarea
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Vui lòng nêu rõ lý do bạn báo cáo nội dung này..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;

