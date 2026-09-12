# Travel Platform

Foundational scaffold for a travel platform (homepage, authentication/account,
recommendations, destinations, library, booking, trip management, travel
assistant, personal feed).

This repository currently contains **Phase 1: Project Initialization** only —
technical foundation for the frontend and backend. No business features
(including authentication) are implemented yet.

## Tech Stack

| Layer      | Choice                                   |
|------------|-------------------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui (added incrementally) |
| Backend    | Node.js, NestJS, TypeScript                |
| Database   | PostgreSQL + Prisma ORM                    |

## Project Structure

```
travel-platform/
├── frontend/     # Next.js app
└── backend/      # NestJS app
```

## Prerequisites

- Node.js 20+ and npm 10+
- A running PostgreSQL instance (local or hosted)

## 1. Install dependencies

From each app folder separately (frontend and backend are independent npm
projects, not a monorepo):

```bash
cd frontend && npm install
cd ../backend && npm install
```

## 2. Configure environment variables

Copy the example env files and fill in real values:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

### Frontend environment variables (`frontend/.env.local`)

| Variable              | Description                          |
|------------------------|---------------------------------------|
| `NEXT_PUBLIC_API_URL`  | Base URL of the backend API           |

### Backend environment variables (`backend/.env`)

| Variable        | Description                                         |
|------------------|------------------------------------------------------|
| `NODE_ENV`       | `development` \| `production`                        |
| `PORT`           | Port the NestJS server listens on (default `4000`)    |
| `CORS_ORIGIN`    | Allowed frontend origin (default `http://localhost:3000`) |
| `DATABASE_URL`   | PostgreSQL connection string, required by Prisma      |
| `JWT_ACCESS_SECRET`  | Secret used to sign short-lived access tokens (required) |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime, e.g. `15m` (default `15m`) |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens — must differ from the access secret (required) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime, e.g. `7d` (default `7d`) |
| `REFRESH_COOKIE_NAME` | Name of the httpOnly cookie carrying the refresh token (default `refreshToken`) |

## 3. Set up the database

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

> The Prisma schema currently defines only the datasource/generator
> (connection setup). Business tables (User, Trip, Booking, etc.) will be
> added starting in Phase 2.

## 4. Run the apps (development)

In two separate terminals:

```bash
# Terminal 1
cd frontend && npm run dev      # http://localhost:3000

# Terminal 2
cd backend && npm run start:dev # http://localhost:4000/api/v1
```

Health check: `GET http://localhost:4000/api/v1/health`

## Authentication

See [`docs/authentication.md`](./docs/authentication.md) for the full auth flow,
API reference, and how to run the e2e tests.

## Development commands

| Command (run inside `frontend/` or `backend/`) | Purpose            |
|--------------------------------------------------|---------------------|
| `npm run dev` / `npm run start:dev`              | Start in watch mode |
| `npm run build`                                  | Production build    |
| `npm run start`                                  | Start production build |
| `npm run lint`                                   | Lint the codebase   |
| `npm run typecheck`                              | TypeScript check, no emit |

Backend-only (Prisma):

| Command                    | Purpose                       |
|------------------------------|--------------------------------|
| `npm run prisma:generate`   | Regenerate Prisma client        |
| `npm run prisma:migrate`    | Create/apply a migration        |
| `npm run prisma:studio`     | Open Prisma Studio (DB browser) |

## Status

- [x] Phase 1 — Project initialization (this scaffold)
- [x] Phase 2 — Authentication / Account (foundation)
- [ ] Phase 3 — Explore destinations
- [ ] Phase 4 — Recommendation system
- [ ] Phase 5 — Trip management
- [ ] Phase 6 — Booking & payment
- [ ] Phase 7 — AI travel assistant
- [ ] Phase 8 — Community / personal feed
- [x] User profile module completed