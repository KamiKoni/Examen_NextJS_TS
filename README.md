# ClockHub

ClockHub is a full‑stack internal operations application that provides secure authentication, user and schedule management, operational auditing, and document upload/processing. It is built with Next.js, TypeScript and PostgreSQL (Prisma).

## Overview

The app starts with a product‑focused login screen that shows the operational context, displays seeded demo credentials during local development, and automatically redirects to the dashboard when a valid session exists. From the dashboard you can:

- manage role‑based access
- administer users
- create and edit schedules
- audit critical actions
- upload and process documents

## Technical documentation

- ER diagram: `./docs/ERD.md`
- Delivery guide: `./docs/DELIVERY.md`
- Codebase walkthrough: `./docs/CODEBASE.md`

## Stack

- Next.js 16 + React 19
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT access + refresh tokens with rotation and HttpOnly cookies
- Tailwind CSS 4
- Zod for validation

## Features

- Short‑lived access tokens and rotating refresh tokens
- `HttpOnly`, `SameSite=Lax`, and `Secure` cookies in production
- Support for `Authorization: Bearer <token>` on protected routes
- Roles: `ADMIN`, `MANAGER`, `EMPLOYEE`
- Responsive login with demo credentials available locally
- REST CRUD for users and schedules
- Pagination via `limit`, `offset` or `page` on list endpoints
- Overlap detection to prevent conflicting schedules
- Audit logs for login, logout, refresh and data changes
- Document upload and server‑side processing from the dashboard
- Responsive dashboard using Context API and hooks
- Centralized error handling on frontend and backend

## Permissions model

- `ADMIN` — full administration of users, schedules and audit logs
- `MANAGER` — manage `EMPLOYEE` users, their schedules and view audit logs
- `EMPLOYEE` — view own session and own schedules

## Environment variables

Copy `.env.example` to `.env` and update values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clockhub?schema=public"
JWT_ACCESS_SECRET="change-me-with-a-long-random-secret"
JWT_REFRESH_SECRET="change-me-with-a-different-long-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Generate the Prisma client:

```bash
npm run prisma:generate
```

3. Push the schema to PostgreSQL:

```bash
npm run prisma:push
```

4. Seed example data:

```bash
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000/auth/login` and sign in using one of the demo accounts.

## PostgreSQL with Docker

If you do not have a local PostgreSQL instance, use Docker Compose with the included `docker-compose.yml`:

1. Start the database:

```bash
docker compose up -d
```

2. Check container health:

```bash
docker compose ps
```

3. Push schema and seed data:

```bash
npm run prisma:push
npm run db:seed
```

4. Stop the database when finished:

```bash
docker compose down
```

To also remove the persistent volume:

```bash
docker compose down -v
```

## Seed credentials

- `admin@clockhub.local` / `ChangeMe123!`
- `manager@clockhub.local` / `ChangeMe123!`
- `employee@clockhub.local` / `ChangeMe123!`

## Main endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Schedules

- `GET /api/schedules`
- `POST /api/schedules`
- `GET /api/schedules/:id`
- `PUT /api/schedules/:id`
- `PATCH /api/schedules/:id`
- `DELETE /api/schedules/:id`

### Audit and dashboard

- `GET /api/audit`
- `GET /api/dashboard`
- `GET /api/health`

## Key business rules

- A schedule cannot end before or at the same time it starts.
- Creating or editing schedules that overlap for the same user is not allowed unless the previous schedule is cancelled.
- Managers cannot create, modify or deactivate admins or other managers.
- A user cannot deactivate their own account from the admin panel.
- Every critical action generates an entry in `AuditLog`.

## Authentication on protected routes

Protected routes accept either of these mechanisms:

```http
Authorization: Bearer <access_token>
```

or the `HttpOnly` cookies issued at login.

Expected responses:

- `401` when a token is missing, expired or invalid.
- `403` when an authenticated user lacks sufficient role permissions.

## Pagination

List endpoints accept:

- `limit`
- `offset`
- `page`

Example:

```bash
curl "http://localhost:3000/api/schedules?limit=10&page=2" \
  -H "Authorization: Bearer <access_token>"
```

Responses include `meta.pagination` with `total`, `page`, `offset`, `limit` and `totalPages`.

## Audit filters

`GET /api/audit` also accepts:

- `action`
- `actorId`
- `entityType`

Example:

```bash
curl "http://localhost:3000/api/audit?action=AUTH_LOGIN&entityType=session" \
  -H "Authorization: Bearer <access_token>"
```

## Useful commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:push
npm run db:seed
```

## Project structure

```text
prisma/
  schema.prisma
  seed.ts
src/
  app/
    api/
    auth/login/
    dashboard/
  components/
    auth/
    dashboard/
    ui/
  hooks/
  lib/
  types/
```

## Notes

- `src/proxy.ts` protects `/dashboard` and prevents showing the login screen when a session already exists.
- The login screen preloads the admin credentials to speed up local testing.
- The app expects a real PostgreSQL instance; without a valid `DATABASE_URL`, Prisma and protected routes cannot initialize.
- For production, use distinct, long secrets for access and refresh tokens.
- Module and internal flow documentation is in `docs/CODEBASE.md`.
- The ER diagram and JWT flow are in `docs/DELIVERY.md`.
