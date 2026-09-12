# Authentication / Account — Foundation

Phase 2 scope: register, login, logout, refresh, current-user, route
protection. No booking, trips, library, payments, reviews, or AI features.

## How it works

**Tokens**
- **Access token** — JWT, signed with `JWT_ACCESS_SECRET`, 15 min default
  lifetime. Sent in the response body on register/login/refresh, and by the
  frontend as `Authorization: Bearer <token>` on every API call. Never
  persisted to disk — held in memory only (see frontend section below).
- **Refresh token** — JWT, signed with a *different* secret
  (`JWT_REFRESH_SECRET`), 7 days default lifetime. Sent only as an
  **httpOnly, Secure (in production), SameSite=Lax** cookie scoped to
  `/api/v1/auth`, so client-side JavaScript can never read it (mitigates
  XSS token theft) and it is never sent to unrelated API routes.

**Server-side revocation**
Every refresh token is also recorded in the `refresh_tokens` table as a
SHA-256 hash (never the raw token) with an expiry and a `revokedAt`
column. This is what makes JWT refresh tokens revocable:
- **Login/Register/Refresh** → a new refresh token is created and stored.
- **Refresh** → the token just used is immediately revoked and a new one
  issued (rotation). If a stolen refresh token is replayed after the
  legitimate client already rotated it, the replay is rejected.
- **Logout** → the current refresh token is revoked and the cookie cleared.

**Password storage**
Passwords are hashed with bcrypt (`bcryptjs`, 12 salt rounds) before being
stored. The raw password is never persisted or logged.

**Activity log**
`REGISTER`, `LOGIN`, `LOGIN_FAILED`, and `LOGOUT` events are recorded in
`activity_logs` with IP address and user agent, for the future "Activity
history" account page and basic security auditing.

**Request flow**
```
Register/Login
  → validate credentials
  → issue access token (body) + refresh token (httpOnly cookie)

Authenticated request
  → Authorization: Bearer <accessToken>
  → JwtAuthGuard + JwtStrategy verify signature & expiry
  → request.user = { sub, email }

Access token expired
  → API call fails with 401
  → frontend calls POST /auth/refresh (cookie sent automatically)
  → new access token returned, original request retried once

Logout
  → refresh token revoked in DB, cookie cleared
```

## API Reference

All responses use the shared envelope:
`{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message" } }`.

### `POST /api/v1/auth/register`
Body: `{ fullName, email, password, phoneNumber? }`
- `password` — min 8 chars, at least one letter and one number.
- 201 → `{ user, accessToken }` + sets refresh cookie.
- 409 if the email is already registered.

### `POST /api/v1/auth/login`
Body: `{ email, password }`
- 200 → `{ user, accessToken }` + sets refresh cookie.
- 401 on invalid credentials (identical message for "no such user" and
  "wrong password" — this is intentional, not a bug, so the API never
  reveals which emails exist).

### `POST /api/v1/auth/logout`
Requires `Authorization: Bearer <accessToken>`.
- 200 → revokes the refresh token, clears the cookie.

### `POST /api/v1/auth/refresh`
No access token required — reads the refresh cookie.
- 200 → `{ user, accessToken }`, rotates the refresh cookie.
- 401 if the cookie is missing, expired, or already revoked.

### `GET /api/v1/users/me`
Requires `Authorization: Bearer <accessToken>`.
- 200 → the current user's profile (no `passwordHash`).

### `PATCH /api/v1/users/me`
Requires `Authorization: Bearer <accessToken>`.
Body (all optional): `{ fullName, phoneNumber, avatarUrl, dateOfBirth }`.
- 200 → the updated profile.

## Running the tests

These need a real, running PostgreSQL instance — they were written and
statically checked in this environment but **could not be executed live**
here (no database, no network access in the sandbox that built this).

```bash
cd backend
cp .env.example .env        # fill in a real DATABASE_URL and JWT secrets
npm install
npx prisma migrate deploy   # applies prisma/migrations/20260912160000_init_auth
npm run test:e2e
```

`test/auth.e2e-spec.ts` covers all 7 required scenarios end-to-end:
register → login (success) → login (wrong password) → duplicate email →
logout → refresh → access a protected route without auth (plus one bonus
check: access with a valid token succeeds). It cleans up the test user it
creates in `afterAll`.

## Known limitations / next steps

- No email verification yet (`status` defaults to `ACTIVE` immediately).
- No rate limiting on `/auth/login` or `/auth/register` yet (recommended
  before production: e.g. `@nestjs/throttler`).
- No "revoke all sessions" endpoint yet (the `refresh_tokens` table
  supports it — just needs an endpoint in a later security-settings pass).
- Frontend access token is kept in memory only (a Zustand store, not
  persisted) — a full page reload requires one silent `/auth/refresh` call
  to re-establish the session, which `AuthProvider` performs automatically.
