# Quy ước phông chữ GoReady

**Mọi chữ mới phải dùng class `.t-*`; không khai báo `font-family` ở nơi khác.**

Phông duy nhất: **Be Vietnam Pro** (Google Fonts, weight 400/500/600/700/800), nạp ở `GoReady/index.html` và `GoReady/admin/index.html`.
Cấu hình mặc định: `fontFamily.sans` trong `tailwind.config.js`; `body` dùng `font-sans antialiased`; `input/button/select/textarea` kế thừa phông (`font-family: inherit`) trong `src/index.css`.

## Class chữ (`src/index.css`, `@layer components`)

| Class | Cỡ / weight | Dùng cho |
|---|---|---|
| `.t-logo` | 24px / 800 | Logo |
| `.t-menu` | 16px / 500 | Menu điều hướng |
| `.t-h1` | clamp(36px, 5vw, 56px) / 800 | Tiêu đề lớn (hero) |
| `.t-h2` | 30px / 700 | Tiêu đề trang, tiêu đề mục |
| `.t-h3` | 18px / 600 | Tên tour, tiêu đề card |
| `.t-body` | 16px / 400 | Nội dung |
| `.t-caption` | 14px / 400 | Mô tả phụ, footer, bảng admin |
| `.t-label` | 12px / 600, in hoa | Nhãn ô tìm kiếm |
| `.t-price` | 20px / 700 | Giá, số liệu thống kê |
| `.t-btn` | 16px / 600 | Mọi nút |
| `.t-input` | 16px / 400 | Ô nhập liệu |
| `.t-badge` | 12px / 600 | Nhãn nhỏ, số đếm |

## Quy tắc
- Chỉ dùng weight 400/500/600/700/800. Cấm `font-light`, `font-thin`.
- Không dùng `font-heading`, `font-body`, `font-mono`, `font-serif` hay `font-[...]`. Mã cần chữ số thẳng hàng dùng `tabular-nums`.
- Không hardcode `font-family` trong CSS/JS (ngoại lệ: SVG ảnh dự phòng ở `src/utils/image.ts`, nằm trong `<img>` nên không tải được phông ngoài).
- Vé in (`src/utils/ticketPrint.ts`) là HTML độc lập nên tự nạp Be Vietnam Pro.
