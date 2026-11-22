# Mini LMS

A lightweight learning management system where students book and manage
consultations and administrators view every consultation in the system.

**Stack:** Next.js 16 (App Router), TypeScript, Supabase Auth + PostgreSQL
(`@supabase/supabase-js`, `@supabase/ssr`), Zod, shadcn/ui on Tailwind CSS.

---

## 1. Setup

### Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) with **Node.js 22.15+ or 23.5+**
- npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), running
- The Supabase CLI is installed as a dev dependency and run with `npx supabase`.
  See the
  [Supabase local development guide](https://supabase.com/docs/guides/local-development)
  for background.

### Steps

Run every step in order from the `mini-lms` directory.

```bash
# 1. Select the project Node version (.nvmrc → 22). Older versions are rejected.
nvm install && nvm use

# 2. Install the exact locked dependencies.
npm ci

# 3. Create the local env file.
cp .env.example .env.local

# 4. Start local Supabase. This also applies the migration automatically.
npx supabase start

# 5. Print the local API URL and keys.
npx supabase status

# 6. Edit .env.local with the API URL and publishable key from step 5
#    (older CLI versions call the publishable key the anon key):
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-from-status>

# 7. Start the app. Open http://localhost:3000, not 127.0.0.1:3000;
#    the local Auth redirect URLs are allow-listed for localhost only.
npm run dev

# 8. Create an admin user (see next section). Sign up normally to get a student account.
```

| Service         | URL                      |
| --------------- | ------------------------ |
| App             | <http://localhost:3000>  |
| Supabase Studio | <http://127.0.0.1:54323> |
| Mailpit (email) | <http://127.0.0.1:54324> |

### Special instructions

- **Admin accounts are created manually from the Studio.** There is no admin sign-up and no
  seed data. To create one:
  1. Open Studio → **Authentication → Users → Add user**. Enter an email and
     password, tick **Auto confirm user**, then copy the new user's ID.
  2. Open Studio → **Table Editor → `profiles`**. Find that ID and change
     `role` from `student` to `admin`.
  3. Sign in to the app with that account. You are taken to
     `/admin/consultations`.

  Every new user starts as a `student`, and only
  privileged access (Studio or the service role) can change a role.

- **Email confirmation is disabled locally**, so signing up logs you straight
  in. Password-reset emails go to Mailpit.

---

## 2. Implementation summary

- **Architecture:**

```text
Browser (React client components)
   │
   ▼
Route Handlers  app/api/consultations/**
   withHttpErrorHandling → withAuth → withSameOrigin → withValidatedBody (Zod)
   ▼
Data access layer  lib/dal/**   (queries, Zod row validation, snake_case → camelCase)
   ▼
Supabase PostgreSQL   column grants → RLS policies → state-rule triggers
```

- **API:**

  | Endpoint                        | Purpose                                                                      |
  | ------------------------------- | ---------------------------------------------------------------------------- |
  | `GET /api/consultations`        | List consultations visible to the caller: own rows, or all rows for an admin |
  | `POST /api/consultations`       | Book a consultation → `201`                                                  |
  | `PATCH /api/consultations/[id]` | `{ action: "setStatus" \| "reschedule" \| "cancel", updatedAt, ... }`        |

- **Layout:**
  - `app/`: routes
  - `components/{admin,student,auth,forms,dialogs,routing,layout,ui}`
  - `hooks/`
  - `lib/{api,dal,clients,validation,supabase}`
  - `supabase/{migrations,tests}`
  - `tests/{api,ui}`

- **Pages are server components.** Server-side role guards (`RoleOnly`,
  `GuestOnly`) protect each page. A user who opens the other role's page is
  redirected to their own home, and `/` redirects there too.

- **Errors use one JSON shape:** `{ error: { code, message, details? } }`.
  Codes used: `400`, `401`, `403`, `404`, `409`, `422`, and `500`.

- **Security:**
  1. Session check (`withAuth`, JSON `401`).
  2. Same-origin check for mutations (`withSameOrigin`).
  3. Zod validation (`withValidatedBody`).
  4. Column grants.
  5. RLS policies.
  6. Database triggers.

---

## 3. Justifications and Assumptions

### Role Based Access Control (RBAC)

- **Roles:** `profiles.role` is a `student` or `admin` enum. Sign-up creates a
  student profile transactionally; clients cannot change roles. Roles stay
  out of editable `user_metadata`, which users can modify.
- **RLS:** The browser can call Supabase's Data API directly, so database
  policies enforce access even when requests bypass the app's API.
- **Admin checks:** `private.is_admin()` uses `SECURITY DEFINER` to check roles
  without recursive RLS evaluation. It reads the database each request, so
  demotions take effect immediately. Its non-exposed schema and empty
  `search_path` prevent object-name hijacking.
- **Policy performance:** `(select private.is_admin())` and
  `(select auth.uid())` run checks once per query, not per row. JWT role claims
  avoid a lookup but can be stale after role changes.
- **Admin access:** The brief asks for viewing only, so admins cannot create or
  update consultations, including their own.
- **Provisioning:** Admins are created manually; no `super_admin` or management
  UI is needed. Directly seeding `auth.users` would depend on Supabase internals.

### Security

- **Write permissions:** `student_id` defaults to `auth.uid()` and cannot be
  changed, preventing students from booking for others. Anonymous table access
  is disabled, and deletes are disabled to preserve consultation history.
- **CSRF:** Mutations require a matching `Origin`; together with `SameSite`
  cookies this blocks cross-site browser requests without a separate token.
- **Proxy:** It refreshes sessions and redirects, but is not the security
  boundary. Pages, API routes, and RLS independently check access.
- **No service-role key:** Queries run as the signed-in user so RLS cannot be
  bypassed by privileged application access.
- **Passwords:** The local six-character minimum has no complexity rules and
  is weak; production needs a stronger password policy.
- **Production Auth:** Local email confirmation is disabled. A hosted
  deployment needs reviewed HTTPS/redirect settings, SMTP and a tested
  confirmation callback, stronger password policy, secure cookies, and
  appropriate security headers.
- **Caching:** Responses are user-specific, so `private, no-store` prevents
  shared caches from serving one user's data to another. The proxy also
  forwards Supabase's no-cache headers when refreshing a session.
- **Client creation:** ESLint restricts Supabase client factories to
  `lib/supabase/**` so all clients use consistent cookie handling.

### APIs

- **Initial load:** The student page reads the DAL directly for a faster first
  load; changes use the API and refresh the list.
- **Wrappers:** Four small composable wrappers avoid an extra framework
  dependency; the outer error handler also catches authentication failures.
- **Validation:** Zod rejects invalid requests and unexpected database rows.
  One mapper keeps database `snake_case` and API `camelCase` consistent.
- **PATCH actions:** `setStatus`, `reschedule`, and `cancel` constrain each
  update; the database rejects changing time and status together.
- **Optimistic concurrency:** Comparing `updatedAt` returns `409` for stale
  app-API updates instead of silently overwriting a newer change. Direct
  Supabase Data API writes still follow RLS and database rules, but do not use
  this version check.
### Data and Migrations

- **Migration:** One initial migration defines the schema for a reproducible
  setup. With no production data to preserve, development changes were
  consolidated into it; future changes should use new migrations.
- **Names:** Stored per consultation because they are part of the booking and
  may differ between bookings. Profiles hold only `id`, `role`, and timestamps.
- **Constraints:** Enums restrict roles and statuses; `timestamptz` stores an
  exact instant; indexes support ordered lists and prevent duplicate scheduled
  bookings at the same instant.
- **Cancellation:** Sets `status = 'cancelled'` to preserve history.
  `ON DELETE RESTRICT` prevents deleting users whose consultations are retained.
- **No seed data:** Testers sign up normally, exercising the actual profile
  trigger instead of relying on fixtures.

### Rules

**Statuses**

- `scheduled` means incomplete; students can mark it complete.
- Completion is final: reopening a past consultation would leave it scheduled
  but still ineligible for rescheduling or cancellation.
- `scheduled → completed | cancelled` keeps outcomes explicit and final.

**Times**

- **Display:** Times switch to the viewer's timezone after hydration; a
  deterministic initial format avoids server/client hydration mismatches.
- **Booking:** `timestamptz` stores an unambiguous instant. Times must be in the
  future; the form improves feedback, while the API and database enforce it.
- **Rescheduling and cancellation:** Only allowed before the start time.
  Buttons may remain visible until the list refreshes, but late submissions are
  rejected by the client and database.

### Scalability

- **Stateless app:** Cookie sessions and PostgreSQL storage let app instances
  scale horizontally without shared in-memory state.
- **Queries:** Indexes support list ordering, and `(select …)` reduces repeated
  policy checks. Database rules also protect future clients and jobs.
- **Roles:** New roles need enum, policy, and routing updates, not a rewrite.
- **Pagination:** Lists are capped by Supabase's default 1,000-row limit.
  Keyset pagination can use the existing `(scheduled_at, id)` index.

---

## 4. Schema

`supabase/migrations/20261122105901_create_lms_schema.sql`

| Table           | Columns                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`      | `id` (PK, FK → `auth.users`), `role app_role default 'student'`, `created_at`, `updated_at`                                                                                                               |
| `consultations` | `id`, `student_id` (FK → `profiles`, default `auth.uid()`), `first_name`, `last_name`, `reason`, `scheduled_at timestamptz`, `status consultation_status default 'scheduled'`, `created_at`, `updated_at` |

---

## 5. Testing

> The automated tests were fully AI-generated, then reviewed and run locally.

| Suite                    | Command            | Covers                                                                   |
| ------------------------ | ------------------ | ------------------------------------------------------------------------ |
| Database (pgTAP)         | `npm run db:test`  | Grants, RLS, triggers, and roles; needs local Supabase running           |
| API (`node:test`)        | `npm run test:api` | Route handlers, wrappers, and validation, using a mocked Supabase client |
| UI helpers (`node:test`) | `npm run test:ui`  | Client API helpers, form schemas, and time/DST conversion                |

Static checks: `npm run lint`, `npm run typecheck`, `npm run format:check`,
and `npm run build`.

See [TESTING.md](./TESTING.md) for what each suite covers and a manual
end-to-end checklist.
