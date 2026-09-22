# Quy tắc làm việc nhóm & Git Workflow

## 1. Quy tắc cấu trúc tên nhánh (Branch Structure)

**Quy ước đặt tên Nhánh (Branch):**  
`Loại công việc/Tính năng (Feature Key)-mô tả ngắn`

### Các loại công việc (type):
- `feature/` hoặc `feat/`: Phát triển tính năng mới.
- `fix/` hoặc `bugfix/`: Sửa lỗi.
- `ui/`: Chỉ làm/sửa giao diện, chưa ghép API.
- `refactor/`: Tối ưu lại code mà không đổi logic.

### Bảng quy ước Feature Key và ví dụ tên nhánh chuẩn:
| Tính năng | Feature Key | Ví dụ tên nhánh chuẩn |
| :--- | :--- | :--- |
| Giao diện trang chủ | `home` | `ui/home-layout`, `feat/home-banner-tour` |
| Đăng nhập / Tài khoản | `auth` | `feat/auth-login-google`, `feat/auth-user-profile` |
| Khám phá | `explore` | `feat/explore-filter-location`, `ui/explore-search-bar` |
| Gợi ý | `recommend` | `feat/recommend-tour-by-interest`, `feat/recommend-algorithm` |
| Thư viện | `library` | `feat/library-save-tour`, `feat/library-compare-tour` |
| Đặt dịch vụ | `booking` | `feat/booking-checkout-step`, `feat/booking-payment-momo` |
| Quản lý chuyến đi | `trip` | `feat/trip-list-booked`, `feat/trip-ticket-detail` |
| Trợ lý du lịch | `assistant` | `feat/assistant-chat-ui`, `feat/assistant-ai-suggest` |
| Bảng tin cá nhân | `feed` | `feat/feed-post-list`, `feat/feed-follow-user` |

---

## 2. Quy ước viết Commit Message

Để lịch sử Git của nhóm chuyên nghiệp và dễ tra cứu, luôn viết tin nhắn commit (Commit message) rõ ràng, phản ánh chính xác nội dung công việc trước khi push code lên.
- **Ví dụ chuẩn:** `Thêm banner và danh sách tour nổi bật ở trang chủ`

---

## 3. Báo cáo Token sau mỗi lần làm việc

- Sau mỗi lần code, kiểm tra lại token và báo cáo lên nhóm.
- **Cách kiểm tra:** Mở VSCode, vào Claude gõ `/context` và enter.
- **Mẫu tin nhắn báo cáo:**
  `Cập nhật Token ngày [DD/MM] - [HHhMM] (Gửi kèm ảnh cap màn hình)`
