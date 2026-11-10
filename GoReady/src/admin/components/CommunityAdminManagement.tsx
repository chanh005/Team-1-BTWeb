import React from 'react';
import type { Tour, AccountUser } from '../../types';
import type { CommunityPost, CommunityPostGroup, CommunityReport } from '../../types/community';
import { COMMUNITY_CONFIG } from '../../config/community';
import { communityApi } from '../../services/communityApi';
import { CommunityEditor } from '../../components/community/CommunityEditor';
import { CommunityImageUploader, type UploadedMediaItem } from '../../components/community/CommunityImageUploader';

interface CommunityAdminManagementProps {
  adminUser: AccountUser;
  tours: Tour[];
}

type MainTab = 'posts' | 'official' | 'reports' | 'comments' | 'users' | 'logs';

export const CommunityAdminManagement: React.FC<CommunityAdminManagementProps> = ({
  adminUser,
  tours,
}) => {
  const [activeTab, setActiveTab] = React.useState<MainTab>('posts');

  // Auth headers for admin
  const authHeaders = React.useMemo(
    () => ({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userName: adminUser.name,
      userRole: 'admin',
    }),
    [adminUser]
  );

  // --------------------------------------------------------------------------
  // 1. TỔNG QUAN KPIs
  // --------------------------------------------------------------------------
  const [stats, setStats] = React.useState<{
    pendingCount: number;
    openReportsCount: number;
    todayPostsCount: number;
    weekPostsCount: number;
    postsByKind: { review: number; post: number; official: number };
  } | null>(null);

  const loadStats = React.useCallback(async () => {
    try {
      const data = await communityApi.getAdminStats(authHeaders);
      setStats(data);
    } catch (err) {
      console.error('Lỗi khi tải thống kê:', err);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  // --------------------------------------------------------------------------
  // 2. QUẢN LÝ BÀI VIẾT (POSTS)
  // --------------------------------------------------------------------------
  const [postStatusTab, setPostStatusTab] = React.useState<string>('pending');
  const [posts, setPosts] = React.useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterGroup, setFilterGroup] = React.useState('all');
  const [filterDestination, setFilterDestination] = React.useState('all');
  const [selectedPostIds, setSelectedPostIds] = React.useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Modal từ chối bài viết
  const [rejectModalPost, setRejectModalPost] = React.useState<CommunityPost | null>(null);
  const [rejectReasonChoice, setRejectReasonChoice] = React.useState(COMMUNITY_CONFIG.REJECT_REASONS[0]);
  const [rejectReasonCustom, setRejectReasonCustom] = React.useState('');

  // Modal xem trước bài viết
  const [previewPost, setPreviewPost] = React.useState<CommunityPost | null>(null);

  const loadPosts = React.useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await communityApi.getAdminPosts(postStatusTab, 1, 100, authHeaders);
      setPosts(res.items);
      setSelectedPostIds([]);
    } catch (err) {
      console.error('Lỗi khi tải bài viết:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [postStatusTab, authHeaders]);

  React.useEffect(() => {
    if (activeTab === 'posts') {
      loadPosts();
    }
  }, [activeTab, loadPosts]);

  // Hành động kiểm duyệt bài viết
  const handleModerate = async (postId: string, action: 'publish' | 'reject' | 'hide' | 'unhide' | 'pin' | 'unpin' | 'delete', reason = '') => {
    if (action === 'delete') {
      if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không? Hành động này sẽ được ghi vào nhật ký kiểm duyệt.')) {
        return;
      }
    }
    setActionLoadingId(postId);
    try {
      await communityApi.moderatePost(postId, { action, reason }, authHeaders);
      await Promise.all([loadPosts(), loadStats()]);
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xác nhận từ chối bài viết kèm lý do bắt buộc
  const handleConfirmReject = async () => {
    if (!rejectModalPost) return;
    const finalReason = rejectReasonChoice.startsWith('Khác') ? rejectReasonCustom.trim() : rejectReasonChoice;
    if (!finalReason) {
      alert('Vui lòng chọn hoặc nhập lý do từ chối bài viết');
      return;
    }
    await handleModerate(rejectModalPost.id, 'reject', finalReason);
    setRejectModalPost(null);
    setRejectReasonCustom('');
  };

  // Duyệt hàng loạt
  const handleBulkPublish = async () => {
    if (selectedPostIds.length === 0) return;
    if (!window.confirm(`Duyệt công khai ${selectedPostIds.length} bài viết đã chọn?`)) return;

    try {
      await communityApi.bulkPublish(selectedPostIds, authHeaders);
      await Promise.all([loadPosts(), loadStats()]);
      alert(`Đã duyệt thành công ${selectedPostIds.length} bài viết!`);
    } catch (err: any) {
      alert(err.message || 'Duyệt hàng loạt thất bại');
    }
  };

  // Lọc bài viết ở client
  const filteredPosts = posts.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthor = p.authorName.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor) return false;
    }
    if (filterGroup !== 'all' && p.group !== filterGroup) return false;
    if (filterDestination !== 'all' && p.destination !== filterDestination) return false;
    return true;
  });

  // --------------------------------------------------------------------------
  // 3. ADMIN ĐĂNG BÀI CHÍNH THỨC
  // --------------------------------------------------------------------------
  const [officialTitle, setOfficialTitle] = React.useState('');
  const [officialGroup, setOfficialGroup] = React.useState<CommunityPostGroup>('family');
  const [officialDestination, setOfficialDestination] = React.useState(COMMUNITY_CONFIG.DESTINATIONS[0]);
  const [officialContent, setOfficialContent] = React.useState('');
  const [officialMedia, setOfficialMedia] = React.useState<UploadedMediaItem[]>([]);
  const [officialCover, setOfficialCover] = React.useState('');
  const [officialTourId, setOfficialTourId] = React.useState('');
  const [officialIsPinned, setOfficialIsPinned] = React.useState(true);
  const [creatingOfficial, setCreatingOfficial] = React.useState(false);

  const handleCreateOfficialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialTitle.trim() || !officialContent.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết');
      return;
    }

    setCreatingOfficial(true);
    try {
      await communityApi.createPost(
        {
          kind: 'post',
          title: officialTitle.trim(),
          contentHtml: officialContent,
          group: officialGroup,
          destination: officialDestination,
          coverImage: officialCover || (officialMedia.length > 0 ? officialMedia[0].url : undefined),
          media: officialMedia.map((m) => ({ url: m.url, alt: m.alt })),
          tourId: officialTourId || null,
          isOfficial: true,
        },
        authHeaders
      );

      // Reset form
      setOfficialTitle('');
      setOfficialContent('');
      setOfficialMedia([]);
      setOfficialCover('');
      setOfficialTourId('');
      alert('Đã xuất bản bài viết chính thức từ GoReady thành công!');
      setActiveTab('posts');
      setPostStatusTab('published');
      await Promise.all([loadPosts(), loadStats()]);
    } catch (err: any) {
      alert(err.message || 'Không thể tạo bài viết chính thức');
    } finally {
      setCreatingOfficial(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. BÁO CÁO VI PHẠM (REPORTS)
  // --------------------------------------------------------------------------
  const [reports, setReports] = React.useState<CommunityReport[]>([]);
  const [loadingReports, setLoadingReports] = React.useState(false);
  const [reportFilter, setReportFilter] = React.useState<'open' | 'resolved' | 'dismissed' | 'all'>('open');

  const loadReports = React.useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await communityApi.getAdminReports(reportFilter, authHeaders);
      setReports(data);
    } catch (err) {
      console.error('Lỗi khi tải báo cáo:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [reportFilter, authHeaders]);

  React.useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, loadReports]);

  const handleReportAction = async (reportId: string, status: 'resolved' | 'dismissed', note = '') => {
    try {
      await communityApi.handleReport(reportId, status, note, authHeaders);
      await Promise.all([loadReports(), loadStats()]);
    } catch (err: any) {
      alert(err.message || 'Không thể xử lý báo cáo');
    }
  };

  // --------------------------------------------------------------------------
  // 5. QUẢN LÝ BÌNH LUẬN (COMMENTS)
  // --------------------------------------------------------------------------
  const [adminComments, setAdminComments] = React.useState<any[]>([]);
  const [loadingComments, setLoadingComments] = React.useState(false);

  const loadAdminComments = React.useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await communityApi.getAdminComments(authHeaders);
      setAdminComments(data);
    } catch (err) {
      console.error('Lỗi khi tải bình luận:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    if (activeTab === 'comments') {
      loadAdminComments();
    }
  }, [activeTab, loadAdminComments]);

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return;
    try {
      await communityApi.deleteComment(commentId, authHeaders);
      setAdminComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(err.message || 'Không thể xóa bình luận');
    }
  };

  // --------------------------------------------------------------------------
  // 6. THÀNH VIÊN & CHẶN ĐĂNG BÀI (USERS)
  // --------------------------------------------------------------------------
  const [communityUsers, setCommunityUsers] = React.useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);

  const loadCommunityUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await communityApi.getAdminUsers(authHeaders);
      setCommunityUsers(data);
    } catch (err) {
      console.error('Lỗi khi tải thành viên:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    if (activeTab === 'users') {
      loadCommunityUsers();
    }
  }, [activeTab, loadCommunityUsers]);

  const handleToggleUserBan = async (user: any) => {
    const isBanning = !user.isPostBanned;
    let note = '';
    if (isBanning) {
      const promptNote = window.prompt(`Nhập lý do chặn thành viên ${user.userName} đăng bài:`, 'Vi phạm quy định cộng đồng');
      if (promptNote === null) return;
      note = promptNote;
    } else {
      if (!window.confirm(`Mở khóa quyền đăng bài cho thành viên ${user.userName}?`)) return;
    }

    try {
      await communityApi.setUserPostBan(user.userId, isBanning, note, authHeaders);
      await loadCommunityUsers();
      alert(isBanning ? 'Đã khóa quyền đăng bài của người dùng' : 'Đã mở khóa quyền đăng bài');
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    }
  };

  // --------------------------------------------------------------------------
  // 7. NHẬT KÝ KIỂM DUYỆT (LOGS)
  // --------------------------------------------------------------------------
  const [moderationLogs, setModerationLogs] = React.useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);

  const loadModerationLogs = React.useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await communityApi.getAdminLogs(authHeaders);
      setModerationLogs(data);
    } catch (err) {
      console.error('Lỗi khi tải nhật ký:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    if (activeTab === 'logs') {
      loadModerationLogs();
    }
  }, [activeTab, loadModerationLogs]);

  return (
    <div className="space-y-6">
      {/* 1. KHỐI TỔNG QUAN KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Chờ duyệt */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Bài chờ duyệt</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700">⏳</span>
          </div>
          <p className="mt-3 font-heading text-3xl font-extrabold text-amber-900">
            {stats ? stats.pendingCount : '...'}
          </p>
          <span className="text-[11px] text-amber-700">
            {stats && stats.pendingCount > 0 ? 'Cần duyệt bài mới sớm' : 'Đã duyệt hết bài'}
          </span>
        </div>

        {/* Báo cáo mở */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Báo cáo vi phạm</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-700">🚩</span>
          </div>
          <p className="mt-3 font-heading text-3xl font-extrabold text-rose-900">
            {stats ? stats.openReportsCount : '...'}
          </p>
          <span className="text-[11px] text-rose-700">Báo cáo chưa được xử lý</span>
        </div>

        {/* Đăng hôm nay / tuần này */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Bài đăng mới</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">📈</span>
          </div>
          <p className="mt-3 font-heading text-3xl font-extrabold text-slate-900">
            {stats ? stats.todayPostsCount : '...'}
          </p>
          <span className="text-[11px] text-slate-500">
            Tuần này: <strong>{stats ? stats.weekPostsCount : 0}</strong> bài
          </span>
        </div>

        {/* Phân loại bài viết */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Phân loại bài</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">📑</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>⭐ Đánh giá: <strong>{stats?.postsByKind.review ?? 0}</strong></span>
            <span>📝 Bài viết: <strong>{stats?.postsByKind.post ?? 0}</strong></span>
            <span>✨ Chính thức: <strong>{stats?.postsByKind.official ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'posts', label: 'Quản lý bài viết', icon: '📝' },
            { id: 'official', label: 'Tạo bài chính thức', icon: '✨' },
            { id: 'reports', label: 'Báo cáo vi phạm', icon: '🚩' },
            { id: 'comments', label: 'Bình luận', icon: '💬' },
            { id: 'users', label: 'Thành viên', icon: '👥' },
            { id: 'logs', label: 'Nhật ký kiểm duyệt', icon: '📜' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-soft'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'posts' && stats && stats.pendingCount > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-slate-900 ml-1">
                  {stats.pendingCount}
                </span>
              )}
              {tab.id === 'reports' && stats && stats.openReportsCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white ml-1">
                  {stats.openReportsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: QUẢN LÝ BÀI VIẾT */}
      {/* ==================================================================== */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Sub-tabs trạng thái + Bộ lọc + Tìm kiếm */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
            {/* Tabs trạng thái */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'pending', label: 'Chờ duyệt' },
                { id: 'published', label: 'Đã đăng' },
                { id: 'rejected', label: 'Bị từ chối' },
                { id: 'hidden', label: 'Đã ẩn' },
                { id: 'all', label: 'Tất cả' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPostStatusTab(s.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    postStatusTab === s.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Tìm kiếm & Lọc */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Tìm tiêu đề / tác giả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 focus:border-primary focus:outline-none"
              />

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 focus:border-primary focus:outline-none"
              >
                <option value="all">Tất cả nhóm</option>
                {COMMUNITY_CONFIG.GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={filterDestination}
                onChange={(e) => setFilterDestination(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 focus:border-primary focus:outline-none"
              >
                <option value="all">Tất cả điểm đến</option>
                {COMMUNITY_CONFIG.DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nút hành động hàng loạt */}
          {postStatusTab === 'pending' && selectedPostIds.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 border border-amber-200">
              <span className="text-xs font-semibold text-amber-900">
                Đã chọn <strong>{selectedPostIds.length}</strong> bài viết chờ duyệt
              </span>
              <button
                onClick={handleBulkPublish}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                Duyệt tất cả đã chọn
              </button>
            </div>
          )}

          {/* Bảng danh sách bài viết */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  {postStatusTab === 'pending' && (
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.length === filteredPosts.length && filteredPosts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPostIds(filteredPosts.map((p) => p.id));
                          else setSelectedPostIds([]);
                        }}
                      />
                    </th>
                  )}
                  <th className="p-3">Bài viết</th>
                  <th className="p-3">Tác giả</th>
                  <th className="p-3">Phân loại</th>
                  <th className="p-3">Tour gắn</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Ngày gửi</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingPosts ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Đang tải danh sách bài viết...
                    </td>
                  </tr>
                ) : filteredPosts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Không có bài viết nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredPosts.map((post) => {
                    const isSelected = selectedPostIds.includes(post.id);
                    const hasProhibited = (post as any).hasProhibitedWords || false;

                    return (
                      <tr key={post.id} className="hover:bg-slate-50/80 transition-colors">
                        {postStatusTab === 'pending' && (
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedPostIds([...selectedPostIds, post.id]);
                                else setSelectedPostIds(selectedPostIds.filter((id) => id !== post.id));
                              }}
                            />
                          </td>
                        )}

                        <td className="p-3 max-w-xs">
                          <div className="flex items-center gap-2">
                            {post.isPinned && <span title="Được ghim">📌</span>}
                            <span
                              onClick={() => setPreviewPost(post)}
                              className="font-bold text-slate-900 hover:text-primary cursor-pointer line-clamp-1"
                            >
                              {post.title}
                            </span>
                          </div>
                          {hasProhibited && (
                            <span className="inline-block mt-1 rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                              ⚠️ Chứa từ khóa nhạy cảm
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <span className="font-semibold text-slate-700">{post.authorName}</span>
                          {post.isOfficial && (
                            <span className="block text-[10px] font-bold text-primary">GoReady</span>
                          )}
                        </td>

                        <td className="p-3">
                          {post.kind === 'review' ? (
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                              ⭐ Review ({post.rating}★)
                            </span>
                          ) : post.isOfficial ? (
                            <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700">
                              Chính thức
                            </span>
                          ) : (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              Bài chia sẻ
                            </span>
                          )}
                        </td>

                        <td className="p-3 max-w-[140px] truncate">
                          {post.tourId ? (
                            <span className="text-slate-600 font-medium">Mã: {post.tourId}</span>
                          ) : (
                            <span className="text-slate-400">Không gắn</span>
                          )}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              post.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : post.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : post.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {post.status}
                          </span>
                        </td>

                        <td className="p-3 text-slate-500">
                          {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút Xem bài */}
                            <button
                              onClick={() => setPreviewPost(post)}
                              className="rounded-lg border border-slate-200 px-2 py-1 hover:border-primary hover:text-primary transition"
                              title="Xem trước bài viết"
                            >
                              Xem
                            </button>

                            {/* Nút Duyệt nếu đang pending */}
                            {post.status === 'pending' && (
                              <button
                                onClick={() => handleModerate(post.id, 'publish')}
                                disabled={actionLoadingId === post.id}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700"
                              >
                                Duyệt
                              </button>
                            )}

                            {/* Nút Từ chối nếu đang pending */}
                            {post.status === 'pending' && (
                              <button
                                onClick={() => setRejectModalPost(post)}
                                className="rounded-lg bg-rose-600 px-2.5 py-1 font-bold text-white hover:bg-rose-700"
                              >
                                Từ chối
                              </button>
                            )}

                            {/* Nút Ghim / Bỏ ghim nếu đã published */}
                            {post.status === 'published' && (
                              <button
                                onClick={() => handleModerate(post.id, post.isPinned ? 'unpin' : 'pin')}
                                className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-100"
                                title={post.isPinned ? 'Bỏ ghim bài' : 'Ghim bài lên đầu'}
                              >
                                {post.isPinned ? 'Bỏ ghim' : 'Ghim'}
                              </button>
                            )}

                            {/* Nút Ẩn / Bỏ ẩn */}
                            {post.status === 'published' && (
                              <button
                                onClick={() => handleModerate(post.id, 'hide')}
                                className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-100"
                              >
                                Ẩn
                              </button>
                            )}
                            {post.status === 'hidden' && (
                              <button
                                onClick={() => handleModerate(post.id, 'unhide')}
                                className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-100"
                              >
                                Hiện
                              </button>
                            )}

                            {/* Nút Xóa */}
                            <button
                              onClick={() => handleModerate(post.id, 'delete')}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-rose-600 hover:bg-rose-50"
                              title="Xóa bài viết"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: TẠO BÀI VIẾT CHÍNH THỨC */}
      {/* ==================================================================== */}
      {activeTab === 'official' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-4xl">
          <div className="mb-6 border-b border-slate-100 pb-3">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Đăng bài viết chính thức từ GoReady
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bài viết sẽ được xuất bản công khai ngay lập tức mang huy hiệu "GoReady Chính thức".
            </p>
          </div>

          <form onSubmit={handleCreateOfficialPost} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề bài viết:
              </label>
              <input
                type="text"
                value={officialTitle}
                onChange={(e) => setOfficialTitle(e.target.value)}
                placeholder="Nhập tiêu đề thông báo, cẩm nang hoặc gợi ý tour chính thức..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm chủ đề:</label>
                <select
                  value={officialGroup}
                  onChange={(e) => setOfficialGroup(e.target.value as CommunityPostGroup)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                >
                  {COMMUNITY_CONFIG.GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Điểm đến:</label>
                <select
                  value={officialDestination}
                  onChange={(e) => setOfficialDestination(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                >
                  {COMMUNITY_CONFIG.DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      📍 {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gắn Tour gợi ý từ GoReady */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gắn Tour gợi ý từ GoReady (hiển thị sidebar chuyển đổi):
              </label>
              <select
                value={officialTourId}
                onChange={(e) => setOfficialTourId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
              >
                <option value="">-- Không gắn tour --</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.code || t.id}>
                    [{t.code || t.id.slice(0, 5)}] {t.name} ({t.destination})
                  </option>
                ))}
              </select>
            </div>

            {/* Upload ảnh */}
            <div className="rounded-xl border border-slate-200 p-4">
              <CommunityImageUploader
                media={officialMedia}
                onChange={setOfficialMedia}
                coverImage={officialCover}
                onCoverChange={setOfficialCover}
              />
            </div>

            {/* Rich text Editor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung bài viết:</label>
              <CommunityEditor
                value={officialContent}
                onChange={setOfficialContent}
                placeholder="Nhập nội dung bài viết chính thức..."
              />
            </div>

            {/* Ghim bài viết */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="officialPin"
                checked={officialIsPinned}
                onChange={(e) => setOfficialIsPinned(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <label htmlFor="officialPin" className="text-xs font-semibold text-slate-700 cursor-pointer">
                📌 Ghim bài viết này lên đầu trang Cộng đồng
              </label>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={creatingOfficial}
                className="rounded-full bg-primary px-8 py-2.5 text-xs font-bold text-white shadow-card hover:bg-primary-600 disabled:opacity-50"
              >
                {creatingOfficial ? 'Đang xuất bản...' : 'Xuất bản bài chính thức'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: BÁO CÁO VI PHẠM */}
      {/* ==================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 border border-slate-200">
            <div className="flex gap-2">
              {(['open', 'resolved', 'dismissed', 'all'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setReportFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    reportFilter === s ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s === 'open' ? 'Chưa xử lý' : s === 'resolved' ? 'Đã xử lý' : s === 'dismissed' ? 'Bỏ qua' : 'Tất cả'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Loại</th>
                  <th className="p-3">Mã đối tượng</th>
                  <th className="p-3">Người báo cáo</th>
                  <th className="p-3">Lý do</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingReports ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Đang tải...</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Không có báo cáo nào.</td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px]">
                          {rep.targetType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-700">{rep.targetId}</td>
                      <td className="p-3 font-semibold text-slate-700">{rep.reporterName || rep.reporterId}</td>
                      <td className="p-3 max-w-xs font-medium text-rose-700">{rep.reason}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            rep.status === 'open'
                              ? 'bg-rose-100 text-rose-800'
                              : rep.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3 text-right">
                        {rep.status === 'open' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReportAction(rep.id, 'resolved', 'Đã xử lý nội dung vi phạm')}
                              className="rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white hover:bg-emerald-700"
                            >
                              Xử lý
                            </button>
                            <button
                              onClick={() => handleReportAction(rep.id, 'dismissed', 'Báo cáo không chính xác')}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-100"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: QUẢN LÝ BÌNH LUẬN */}
      {/* ==================================================================== */}
      {activeTab === 'comments' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3">Người bình luận</th>
                <th className="p-3">Nội dung</th>
                <th className="p-3">Thuộc bài viết</th>
                <th className="p-3">Thời gian</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingComments ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Đang tải...</td>
                </tr>
              ) : adminComments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Chưa có bình luận nào.</td>
                </tr>
              ) : (
                adminComments.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{c.userName}</td>
                    <td className="p-3 max-w-sm text-slate-700 whitespace-pre-wrap">{c.content}</td>
                    <td className="p-3 max-w-xs truncate text-primary font-medium">{c.postTitle}</td>
                    <td className="p-3 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-rose-600 hover:bg-rose-50"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: THÀNH VIÊN & CHẶN ĐĂNG BÀI */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3">Thành viên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Tổng bài</th>
                <th className="p-3">Đã đăng</th>
                <th className="p-3">Bị từ chối</th>
                <th className="p-3">Trạng thái quyền</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingUsers ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Đang tải...</td>
                </tr>
              ) : communityUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Chưa có người dùng nào đăng bài.</td>
                </tr>
              ) : (
                communityUsers.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{u.userName}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{u.userEmail}</td>
                    <td className="p-3 font-semibold">{u.totalPosts}</td>
                    <td className="p-3 text-emerald-600 font-semibold">{u.publishedPosts}</td>
                    <td className="p-3 text-rose-600 font-semibold">{u.rejectedPosts}</td>
                    <td className="p-3">
                      {u.isPostBanned ? (
                        <div>
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            ⛔ Bị chặn đăng bài
                          </span>
                          {u.banNote && <p className="text-[10px] text-rose-600 mt-0.5 italic">{u.banNote}</p>}
                        </div>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Bình thường
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserBan(u)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          u.isPostBanned
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {u.isPostBanned ? 'Mở chặn' : 'Chặn đăng bài'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: NHẬT KÝ KIỂM DUYỆT */}
      {/* ==================================================================== */}
      {activeTab === 'logs' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Quản trị viên</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Đối tượng</th>
                <th className="p-3">Mã đối tượng</th>
                <th className="p-3">Lý do / Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingLogs ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Đang tải nhật ký...</td>
                </tr>
              ) : moderationLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Chưa có nhật ký nào.</td>
                </tr>
              ) : (
                moderationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{log.adminId}</td>
                    <td className="p-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-600">{log.targetType}</td>
                    <td className="p-3 font-mono text-slate-500">{log.targetId}</td>
                    <td className="p-3 text-slate-700 italic">{log.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL TỪ CHỐI BÀI VIẾT KÈM LÝ DO */}
      {/* ==================================================================== */}
      {rejectModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-heading text-lg font-bold text-slate-900 mb-1">
              Từ chối bài viết: "{rejectModalPost.title}"
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tác giả: <strong>{rejectModalPost.authorName}</strong>. Vui lòng chọn lý do để tác giả nhận được phản hồi chính xác.
            </p>

            <div className="space-y-2 mb-4">
              {COMMUNITY_CONFIG.REJECT_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="adminRejectReason"
                    value={r}
                    checked={rejectReasonChoice === r}
                    onChange={() => setRejectReasonChoice(r)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            {rejectReasonChoice.startsWith('Khác') && (
              <div className="mb-4">
                <textarea
                  rows={3}
                  value={rejectReasonCustom}
                  onChange={(e) => setRejectReasonCustom(e.target.value)}
                  placeholder="Ghi rõ lý do từ chối bài viết này..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalPost(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-rose-700"
              >
                Xác nhận từ chối bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL XEM TRƯỚC BÀI VIẾT (PREVIEW) */}
      {/* ==================================================================== */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
              <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-800">
                👀 Xem trước bài viết kiểm duyệt
              </span>
              <button
                onClick={() => setPreviewPost(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <article className="prose prose-slate max-w-none">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <span className="font-bold text-slate-700">Tác giả: {previewPost.authorName}</span>
                <span>·</span>
                <span>Điểm đến: {previewPost.destination}</span>
                <span>·</span>
                <span>Chủ đề: {previewPost.group}</span>
                {previewPost.kind === 'review' && (
                  <span className="font-bold text-amber-600">· ⭐ Review {previewPost.rating}/5 sao</span>
                )}
              </div>

              <h1 className="font-heading text-2xl font-bold">{previewPost.title}</h1>

              {previewPost.coverImage && (
                <img
                  src={previewPost.coverImage}
                  alt={previewPost.title}
                  className="rounded-2xl aspect-[16/9] w-full object-cover my-4"
                />
              )}

              <div dangerouslySetInnerHTML={{ __html: previewPost.contentHtml }} />
            </article>

            <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">Mã bài: {previewPost.id}</span>
              <div className="flex items-center gap-2">
                {previewPost.status === 'pending' && (
                  <>
                    <button
                      onClick={async () => {
                        await handleModerate(previewPost.id, 'publish');
                        setPreviewPost(null);
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                    >
                      Duyệt ngay
                    </button>
                    <button
                      onClick={() => {
                        const target = previewPost;
                        setPreviewPost(null);
                        setRejectModalPost(target);
                      }}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700"
                    >
                      Từ chối
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPreviewPost(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityAdminManagement;

