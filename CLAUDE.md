# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GoReady is a Vietnamese-language tour-booking site (UI text, comments and .env docs are in Vietnamese). No test runner or linter script is configured; `npm run build` (type-check + bundle) is the only verification step.

## Layout — three separate packages, each with its own `package-lock.json`

- `GoReady/` — the app: Vite + React 18 + TypeScript + Tailwind frontend, plus the API code (`api/`, `lib/`) and the local dev server (`GoReady/backend/`).
- `GoReady/backend/` — Express 4 dev server (plain JS) that mounts the same `lib/` logic locally.
- `backend/` (repo root) — a separate Express 5 + TypeScript service (`tsx`) that serves only `/api/suggested-tours*` from a `suggested_tours` table, configured via `DATABASE_URL`. Independent of the GoReady API.

## Commands

GoReady frontend (run in `GoReady/`):
- `npm run dev` — Vite on http://localhost:5183 (user site) and `/admin/` (admin app)
- `npm run build` — `tsc -b && vite build` (this is what CI runs)

GoReady local API (run in `GoReady/backend/`): `npm run dev` (watches `src/` and `../lib`, loads `../.env`), or `npm start`. Listens on :4000. Vite proxies `/api` → `localhost:4000`. On Windows, `GoReady/Mo-Trang-Web.bat` starts both and opens the browser.

Root `backend/`: `npm run dev`, `npm run seed` (loads tours from CSV/Google Sheet into DB), `npm run typecheck`.

## Architecture

**Dual API surface sharing one core.** Business logic and SQL live in `GoReady/lib/*.js` (`tours`, `bookings`, `users`, `images`, `schema`, `db`). It's exposed two ways:
- Production (Vercel): serverless handlers in `GoReady/api/**` (file-path routing, e.g. `api/tours/[id]/hidden.js`).
- Local dev: Express routers in `GoReady/backend/src/routes/*` mounting the same `lib/` functions.
A new endpoint therefore needs both a `api/` handler and an Express route, calling a shared `lib/` function. The frontend always calls relative `/api/...` (`GoReady/src/api.ts`).

**Database.** Postgres (Neon) via `POSTGRES_URL` in `GoReady/.env` (note: the root `backend/` uses `DATABASE_URL` instead). `lib/schema.js` `ensureSchema` creates tables idempotently and `seedIfEmpty` loads `lib/seed-data/*.json`; every handler/startup calls both, so schema changes go there (use `ALTER ... IF NOT EXISTS`-style migrations). Camel-case columns are quoted (`"coverImage"`). Tour images are uploaded as base64 and stored in DB via `/api/images`.

**Two frontends, one Vite build.** `vite.config.ts` has two rollup inputs: `index.html` (`src/main.tsx` → `src/App.tsx`, the customer site) and `admin/index.html` (`src/admin/*`, tours/bookings/users/dashboard management). Types are shared in `src/types.ts`.

**Customer app (`src/App.tsx`)** is a single large component that owns state and switches `view` (home/explore/etc.) rather than using a router. Deep links use hash routes handled by custom hooks (`useTourRoute`, `useExploreRoute`, e.g. `#/explore?...`). Saved/compared tours, checklists, etc. persist in localStorage (`useLocalStorage`); server data refreshes via `usePolledResource`.

**Tour data sources with fallback.** Tours come from `/api/tours`; "Gợi ý chuyến đi" suggested tours come from `useSuggestedTours` → `services/suggestedTours.ts`, which reads a Google Sheet (`VITE_SUGGESTED_TOURS_URL`) or falls back to `public/data/suggested-tours.csv`. `mergeSuggestedTours` merges them; tour image filenames resolve against `VITE_TOUR_IMAGE_BASE` (default `/images/tours/`).

**Seller Center (doanh nghiệp lữ hành đăng tour).** Trang thứ ba trong cùng bản build: `seller/index.html` → `src/seller/*` (http://localhost:5183/seller/), điều hướng bằng hash (`#/tong-quan`, `#/booking?status=pending`...). Server: `lib/seller.js` (đăng ký/đăng nhập/hồ sơ/file), `lib/sellerTours.js`, `lib/sellerBookings.js`, `lib/sellerDashboard.js`, `lib/sellerReports.js`; route `backend/src/routes/seller.js` mount ở `/api/seller` trong cả `backend/src/index.js` và `api/index.js`.
- **Đăng nhập seller:** `POST /api/seller/login` trả token ký HMAC (`lib/auth.js`, cần `SELLER_TOKEN_SECRET` trong `GoReady/.env` và biến môi trường Vercel). Mọi API `/api/seller/*` (và `/admin/*` của nó) kiểm tra token + vai trò lấy mới từ DB; Admin cũng lấy token này lúc đăng nhập trang Admin để dùng tab "Duyệt hồ sơ". Các API cũ (`/api/users`, `/api/tours`...) vẫn không có xác thực.
- **Migration:** `lib/migrations/001..003` chạy từ `ensureSchema`, chỉ thêm bảng/cột. `sellers`, `seller_files` (file lưu trong DB), cột mới của `tours` (`seller_id`, `status`, `reject_reason`, `child_policy`, `notes`, `updated_at`), `tour_itinerary_days`, `tour_images`, `tour_departures`, cột mới của `bookings` (`departure_id`, `seller_note`, `confirmed_at`, `completed_at`).
- **Trạng thái:** sellers `pending→approved|rejected`; tours `draft→pending_review→active|rejected`, seller chuyển `active↔hidden`, sửa giá/lịch trình tour đang bán thì về `pending_review`; bookings `pending→confirmed→completed|rejected|cancelled` (booking cũ `upcoming` coi như pending ở phía seller). Người mua chỉ thấy tour `status='active'` qua `GET /api/tours?public=1` (Admin gọi không tham số để thấy tất cả).
- **Tour của seller dùng lịch khởi hành thật:** `listTours({publicOnly})` kèm `sellerDepartures`; `buildDepartures()` (`src/data/departures.ts`) dùng chúng thay lịch tự sinh (mã đoàn `SD-<id>`). Số chỗ chỉ trừ ở server khi seller xác nhận (`confirmSellerBooking`: transaction + `FOR UPDATE`); hủy booking đã xác nhận trả chỗ (`updateBookingStatus`). Booking của tour seller tạo ra `pending` (`createBooking`).
- **Kiểm tra thủ công:** `GoReady/backend/seller-test.html` (mở bằng trình duyệt khi server local đang chạy) có nút cho từng bước API.
- Chưa làm: thanh toán online (bước "Khách thanh toán" chỉ hiện cho đủ hình), email/thông báo, cột tài khoản ngân hàng.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds `GoReady/` (Node 20, `npm ci && npm run build`) and publishes `GoReady/dist` to GitHub Pages. That is static only — the `api/` serverless functions run on Vercel, not Pages.
