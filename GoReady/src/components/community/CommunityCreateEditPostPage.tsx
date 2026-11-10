import React from 'react';
import type { CommunityPost, CommunityPostGroup } from '../../types/community';
import { COMMUNITY_CONFIG } from '../../config/community';
import { communityApi } from '../../services/communityApi';
import { CommunityEditor } from './CommunityEditor';
import { CommunityImageUploader, type UploadedMediaItem } from './CommunityImageUploader';
import { CommunityVerifiedBookingSelector, type EligibleBooking } from './CommunityVerifiedBookingSelector';

interface CommunityCreateEditPostPageProps {
  currentUser: { id: string; email: string; name: string; role?: string } | null;
  onOpenLogin: () => void;
  editPostId?: string | null;
  onComplete: () => void;
  onCancel: () => void;
}

// Hàm chuẩn hóa hashtag không dấu
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

export const CommunityCreateEditPostPage: React.FC<CommunityCreateEditPostPageProps> = ({
  currentUser,
  onOpenLogin,
  editPostId,
  onComplete,
  onCancel,
}) => {
  const [title, setTitle] = React.useState('');
  const [group, setGroup] = React.useState<CommunityPostGroup>('family');
  const [destination, setDestination] = React.useState(COMMUNITY_CONFIG.DESTINATIONS[0]);
  const [contentHtml, setContentHtml] = React.useState('');
  const [media, setMedia] = React.useState<UploadedMediaItem[]>([]);
  const [coverImage, setCoverImage] = React.useState<string>('');
  const [hashtags, setHashtags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');

  // Verified review state
  const [booking, setBooking] = React.useState<EligibleBooking | null>(null);
  const [rating, setRating] = React.useState<number | null>(5);

  const [loading, setLoading] = React.useState(false);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Nếu đang ở chế độ sửa: tải bài viết cũ
  React.useEffect(() => {
    if (!editPostId || !currentUser) return;
    setLoading(true);

    const authHeaders = {
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
    };

    communityApi
      .getMyPosts(authHeaders)
      .then((myPosts) => {
        const found = myPosts.find((p) => p.id === editPostId || p.slug === editPostId);
        if (found) {
          setTitle(found.title);
          setGroup(found.group);
          setDestination(found.destination);
          setContentHtml(found.contentHtml);
          setCoverImage(found.coverImage || '');
          setHashtags(found.hashtags || []);
          if (found.rating) setRating(found.rating);
          if (found.media && Array.isArray(found.media)) {
            setMedia(
              found.media.map((m) => ({
                id: m.id,
                url: m.url,
                alt: m.alt || '',
              }))
            );
          }
          if (found.bookingId) {
            setBooking({
              id: found.bookingId,
              bookingCode: found.bookingId,
              tourId: found.tourId || '',
              tourName: 'Tour đã đi',
              tourDestination: found.destination,
              totalPrice: 0,
            });
          }
        }
      })
      .catch((err) => {
        setError('Không thể tải bài viết để chỉnh sửa: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [editPostId, currentUser]);

  // Gợi ý Hashtags từ điểm đến & nhóm
  const suggestedTags = React.useMemo(() => {
    const list: string[] = [];
    const destNorm = normalizeTag(destination);
    if (destNorm) {
      list.push(destNorm, `dulich${destNorm}`, `review${destNorm}`);
    }

    if (group === 'family') list.push('dulichgiadinh', 'nghiduong', 'mevabe');
    if (group === 'backpack') list.push('phuot', 'trekking', 'khampha');
    if (group === 'deal') list.push('sandeal', 'giare', 'tietkiem');
    if (group === 'student') list.push('sinhvien', 'checkin', 'songao');

    // Lọc những tag chưa có trong danh sách
    return list.filter((t) => t && !hashtags.includes(t)).slice(0, 5);
  }, [destination, group, hashtags]);

  const addTag = (raw: string) => {
    const clean = normalizeTag(raw);
    if (clean && !hashtags.includes(clean) && hashtags.length < 10) {
      setHashtags([...hashtags, clean]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const validate = () => {
    if (!currentUser) {
      onOpenLogin();
      return false;
    }
    if (!title.trim() || title.trim().length < 5) {
      setError('Tiêu đề bài viết phải có ít nhất 5 ký tự');
      return false;
    }
    if (!contentHtml.trim() || contentHtml.replace(/<[^>]*>/g, '').trim().length < 10) {
      setError('Nội dung bài viết quá ngắn. Vui lòng chia sẻ tối thiểu 10 ký tự');
      return false;
    }
    if (booking && (!rating || rating < 1 || rating > 5)) {
      setError('Vui lòng chọn số sao đánh giá cho chuyến đi (1 - 5 sao)');
      return false;
    }
    return true;
  };

  // Lưu nháp (status = draft)
  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSavingDraft(true);
    setError(null);

    const authHeaders = {
      userId: currentUser!.id,
      userEmail: currentUser!.email,
      userName: currentUser!.name,
      userRole: currentUser!.role,
    };

    try {
      const payload = {
        kind: (booking ? 'review' : 'post') as 'review' | 'post',
        title: title.trim(),
        contentHtml,
        group,
        destination,
        hashtags,
        coverImage: coverImage || (media.length > 0 ? media[0].url : undefined),
        media: media.map((m) => ({ url: m.url, alt: m.alt })),
        tourId: booking?.tourId || null,
        bookingId: booking?.id || null,
        rating: booking ? rating : null,
        status: 'draft' as const,
      };

      if (editPostId) {
        await communityApi.updatePost(editPostId, payload, authHeaders);
      } else {
        await communityApi.createPost(payload, authHeaders);
      }

      alert('Đã lưu bài viết vào mục Nháp thành công!');
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu bản nháp, vui lòng thử lại');
    } finally {
      setSavingDraft(false);
    }
  };

  // Gửi duyệt (status = pending)
  const handleSubmitReview = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    const authHeaders = {
      userId: currentUser!.id,
      userEmail: currentUser!.email,
      userName: currentUser!.name,
      userRole: currentUser!.role,
    };

    try {
      const payload = {
        kind: (booking ? 'review' : 'post') as 'review' | 'post',
        title: title.trim(),
        contentHtml,
        group,
        destination,
        hashtags,
        coverImage: coverImage || (media.length > 0 ? media[0].url : undefined),
        media: media.map((m) => ({ url: m.url, alt: m.alt })),
        tourId: booking?.tourId || null,
        bookingId: booking?.id || null,
        rating: booking ? rating : null,
        status: 'pending' as const,
        submitForReview: true,
      };

      if (editPostId) {
        await communityApi.updatePost(editPostId, payload, authHeaders);
      } else {
        await communityApi.createPost(payload, authHeaders);
      }

      alert('Bài viết của bạn đã được gửi tới Ban quản trị và đang chờ duyệt!');
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Không thể gửi bài viết, vui lòng kiểm tra lại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <main className="container-px mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-3xl">
          ✍️
        </div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">
          Đăng nhập để chia sẻ trải nghiệm
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Hãy đăng nhập hoặc tạo tài khoản GoReady để viết bài, review chuyến đi và tương tác cùng cộng đồng.
        </p>
        <button
          onClick={onOpenLogin}
          className="mt-6 rounded-full bg-primary px-8 py-3 text-xs font-bold text-white shadow-card hover:bg-primary-600 transition-colors"
        >
          Đăng nhập ngay
        </button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="container-px mx-auto max-w-4xl py-12 text-center">
        <div className="h-10 w-48 mx-auto rounded-xl bg-slate-200 animate-pulse mb-6" />
        <div className="space-y-4 max-w-xl mx-auto animate-pulse">
          <div className="h-12 bg-slate-100 rounded-xl" />
          <div className="h-40 bg-slate-100 rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="container-px mx-auto max-w-4xl py-8 sm:py-12">
      <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <button
            onClick={onCancel}
            className="mb-2 text-xs font-semibold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            ← Quay lại
          </button>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
            {editPostId ? 'Chỉnh sửa bài viết' : 'Viết bài chia sẻ kinh nghiệm'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Xem trước
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* 1. Chọn Tour đã đi (Verified Selector) */}
        <CommunityVerifiedBookingSelector
          currentUser={currentUser}
          selectedBookingId={booking?.id || null}
          rating={rating}
          onSelectBooking={(b) => {
            setBooking(b);
            if (b?.tourDestination) {
              setDestination(b.tourDestination);
            }
          }}
          onRatingChange={(r) => setRating(r)}
        />

        {/* 2. Tiêu đề bài viết */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Tiêu đề bài viết <span className="text-rose-500">*</span>:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Kinh nghiệm thực tế đưa bé 3 tuổi đi Bà Nà Hills tự túc 3N2Đ..."
            className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm sm:text-base font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            required
          />
        </div>

        {/* 3. Nhóm & Điểm đến */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Nhóm chủ đề <span className="text-rose-500">*</span>:
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as CommunityPostGroup)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs sm:text-sm font-medium text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {COMMUNITY_CONFIG.GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Điểm đến <span className="text-rose-500">*</span>:
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs sm:text-sm font-medium text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {COMMUNITY_CONFIG.DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  📍 {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Upload ảnh */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <CommunityImageUploader
            media={media}
            onChange={setMedia}
            coverImage={coverImage}
            onCoverChange={setCoverImage}
          />
        </div>

        {/* 5. Rich-text Editor */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Nội dung chi tiết <span className="text-rose-500">*</span>:
          </label>
          <CommunityEditor
            value={contentHtml}
            onChange={setContentHtml}
            placeholder="Chia sẻ hành trình, cảm xúc, chi phí và những lưu ý của bạn..."
          />
        </div>

        {/* 6. Hashtags */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Gắn thẻ Hashtag:
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-rose-600"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Nhập thẻ hashtag rồi nhấn Enter..."
              className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => addTag(tagInput)}
              className="rounded-xl bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Thêm
            </button>
          </div>

          {/* Gợi ý Hashtags */}
          {suggestedTags.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
              <span>Gợi ý:</span>
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-primary hover:text-primary transition-colors"
                >
                  +{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thanh nút bấm cuối trang */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-full border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Hủy bỏ
          </button>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <button
              type="button"
              disabled={savingDraft || submitting}
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-none rounded-full border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-primary hover:text-primary transition disabled:opacity-50"
            >
              {savingDraft ? 'Đang lưu...' : 'Lưu bản nháp'}
            </button>

            <button
              type="button"
              disabled={submitting || savingDraft}
              onClick={handleSubmitReview}
              className="flex-1 sm:flex-none rounded-full bg-primary px-8 py-2.5 text-xs font-bold text-white shadow-card hover:bg-primary-600 transition disabled:opacity-50"
            >
              {submitting ? 'Đang gửi...' : 'Gửi duyệt bài viết'}
            </button>
          </div>
        </div>
      </form>

      {/* MODAL XEM TRƯỚC (PREVIEW) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
              <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-800">
                👀 Chế độ xem trước bài viết
              </span>
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <article className="prose prose-slate max-w-none">
              <h1 className="font-heading text-2xl font-bold">{title || 'Chưa nhập tiêu đề'}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 my-2">
                <span>Điểm đến: {destination}</span>
                <span>·</span>
                <span>Chủ đề: {group}</span>
                {booking && <span>· ⭐ Đánh giá {rating}/5 sao</span>}
              </div>

              {coverImage && (
                <img src={coverImage} alt={title} className="rounded-2xl aspect-[16/9] w-full object-cover my-4" />
              )}

              <div dangerouslySetInnerHTML={{ __html: contentHtml || '<p>Chưa có nội dung...</p>' }} />
            </article>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-white shadow hover:bg-primary-600"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default CommunityCreateEditPostPage;

