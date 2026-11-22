# Testing

> The automated tests in this repository were AI-generated. They were then
> reviewed, and run locally.

There are three automated suites:

1. **Database (pgTAP).** Runs against the real local Postgres and proves the
   grants, RLS policies, and triggers.
2. **API (`node:test`).** Exercises the Route Handlers and wrappers with a
   mocked Supabase client.
3. **UI helpers (`node:test`).** Tests the browser-side API client, form
   schemas, and date/time conversion.

Static checks and a manual end-to-end checklist complete the coverage.

## Prerequisites

- Node.js 22.15+ or 23.5+. Run `nvm use`. The test runner relies on
  `module.registerHooks` (added in Node 22.15) and on built-in TypeScript type
  stripping.
- Dependencies installed with `npm ci`.
- For the database suite only: local Supabase running
  (`npx supabase start`).

## Running everything

```bash
npm run db:test       # pgTAP (requires local Supabase)
npm run test:api      # Route Handlers, wrappers, validation
npm run test:ui       # client helpers, form schemas, time utilities
npm run lint          # ESLint (Next, strict type-aware typescript-eslint, import rules)
npm run typecheck     # next typegen && tsc --noEmit
npm run format:check  # Prettier (+ Tailwind class ordering)
npm run build         # production build
```

Expected results: 37 pgTAP, 32 API, and 15 UI tests pass, and every static
check exits with code 0.

## How the Node suites work

- **No extra test framework.** The tests use Node's built-in test runner. Node
  runs the TypeScript source directly
  (`--experimental-strip-types --experimental-default-type=module`).
- **Imports are rewritten at load time.** `module.registerHooks` makes the
  `@/` path alias resolve, and replaces some modules with test doubles:
  - `server-only` becomes an empty module.
  - `@/lib/supabase/server` becomes `tests/api/fixtures/supabase-server.mjs`,
    which exports a mocked `createClient`.
- **No network or database.** Each test builds a fake query chain and asserts
  both the HTTP response and the exact queries that were (or weren't) sent.
- **Browser `fetch` is mocked** with `t.mock.method(globalThis, "fetch", …)`.

## 1. Database: `supabase/tests/database/consultation_rls.test.sql`

This is the most important suite. It runs as real Postgres roles (`anon`,
`authenticated`) with JWT claims set for each user. Everything runs inside a
transaction that is rolled back at the end, so it leaves no data behind.

**Fixtures:**

- Students A and B.
- Admin C, created directly as an admin.
- A past consultation for student A. Triggers are bypassed for this row to
  simulate time passing.

### Sign-up trigger

| Test                                    | Expectation                                               |
| --------------------------------------- | --------------------------------------------------------- |
| sign-up creates a student profile       | New auth user → `profiles.role = student`                 |
| sign-up without names creates a profile | Empty metadata `{}` still succeeds (Studio-created users) |
| sign-up metadata cannot set the role    | `"role": "admin"` in metadata is ignored                  |

### Student A

| Test                                                     | Expected outcome          |
| -------------------------------------------------------- | ------------------------- |
| can book a future consultation                           | succeeds                  |
| consultation stores the supplied name                    | names saved per booking   |
| `student_id` defaults to the signed-in user              | `auth.uid()`              |
| cannot book for another student                          | `42501`                   |
| cannot hold two scheduled consultations at the same time | `23505`                   |
| cannot book in the past                                  | `23514`                   |
| reason must not be blank                                 | `23514`                   |
| sees only their own consultations                        | RLS row count             |
| sees only their own profile                              | RLS row count             |
| cannot update another student's consultation             | 0 rows affected           |
| consultation names are required                          | `23502`                   |
| consultation name must not be blank                      | `23514`                   |
| cannot reassign a consultation (`student_id`)            | `42501` (no column grant) |
| consultations cannot be deleted                          | `42501`                   |
| cannot change their role                                 | `42501`                   |
| cannot reschedule to the past                            | `23514`                   |
| cannot change time and status together                   | `23514`                   |
| can reschedule an upcoming consultation                  | succeeds                  |
| can mark a consultation complete                         | succeeds                  |
| completed consultations cannot be marked incomplete      | `23514`                   |
| cannot cancel a past consultation                        | `23514`                   |
| cannot reschedule a past consultation                    | `23514`                   |
| can cancel an upcoming consultation                      | succeeds                  |
| cancelled consultations cannot be changed                | `23514`                   |
| a cancelled slot can be booked again                     | succeeds                  |

### Anonymous

| Test                      | Expected outcome |
| ------------------------- | ---------------- |
| cannot read consultations | `42501`          |
| cannot read profiles      | `42501`          |

### Admin C

| Test                                           | Expected outcome                    |
| ---------------------------------------------- | ----------------------------------- |
| sees all consultations                         | count equals the RLS-bypassed total |
| sees all profiles                              | count equals the RLS-bypassed total |
| cannot book consultations                      | `42501`                             |
| cannot update consultations                    | 0 rows affected                     |
| cannot update even an admin-owned consultation | 0 rows affected                     |

### Account deletion

| Test                                       | Expected outcome               |
| ------------------------------------------ | ------------------------------ |
| users with consultations cannot be deleted | `23503` (`ON DELETE RESTRICT`) |
| users without consultations can be deleted | succeeds                       |

## 2. API: `tests/api/`

| File                               | What it verifies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consultations-route.test.mjs`     | **GET:** lists RLS-visible rows without adding a student-only filter, so the same query serves admins, and returns JSON `401` without querying. **POST:** normalised booking returns `201`; malformed JSON and invalid fields return `400` without querying; a request without a session returns `401` before the body is read; missing or cross-site `Origin` is rejected before the body is read; DB `23505`/`42501`/`23514` map to `409`/`403`/`422`. **PATCH:** `setStatus`, `reschedule`, and `cancel` send the supplied `updatedAt`; invalid IDs or bodies return `400`; missing rows return `404`; stale versions return `409`. **Wrappers:** `withAuth` preserves the request, route context, and client; the error boundary catches thrown, rejected, and non-`Error` values plus client creation failures, and returns a generic logged `500`. |
| `consultation-validation.test.mjs` | Row → API mapping (snake_case → camelCase); empty lists and each status; malformed rows rejected; `setStatus` only accepts `completed`; booking input trimmed and normalised; invalid names and reasons, timestamps without an offset, and past times rejected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `validated-body.test.mjs`          | `withValidatedBody` reads the body once and passes the transformed data and original context; malformed or empty JSON → `400 INVALID_JSON`; schema errors → `400 INVALID_INPUT` with field details; asynchronous Zod transforms work; unexpected errors propagate to the outer boundary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `with-same-origin.test.mjs`        | A matching `Origin` passes through; missing, `null` (opaque), or cross-site origins → `403` without calling the handler.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `auth-role.test.mjs`               | The role is read from `profiles`; a failed profile query throws instead of silently defaulting to `student`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## 3. UI helpers: `tests/ui/`

| File                            | What it verifies                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consultations-client.test.mjs` | `getConsultations` requests with `cache: "no-store"` and keeps the server's order; accepts empty lists; rejects invalid shapes; surfaces server and network errors. `postConsultation` sends a `POST` and validates the result. `patchConsultation` sends each action with the last-seen `updatedAt`. Conflict and rule errors reach the caller. Invalid JSON or payloads are rejected. |
| `consultation-time.test.mjs`    | The earliest allowed time is the next whole local minute; local input converts to the correct absolute instant; invalid and past times are rejected; DST gaps are rejected and repeated times use the earlier occurrence; server-side formatting is deterministic.                                                                                                                      |
| `form-validation.test.mjs`      | Login and sign-up schemas, sign-up passwords must match, and consultation form limits.                                                                                                                                                                                                                                                                                                  |

## Manual end-to-end checklist

Run this against `http://localhost:3000` with local Supabase.

### Authentication

- [ ] Sign up a new user → redirected to `/student/consultations`.
- [ ] Log out → redirected to login. Visiting `/student/consultations` now
      redirects to login.
- [ ] Log in again → back on the student dashboard. Visiting `/auth/login`
      while signed in redirects to the dashboard.
- [ ] Forgot password → email appears in Mailpit (<http://127.0.0.1:54324>) →
      link opens `/auth/reset-password` → new password works.

### Student

- [ ] **Book consultation** with first name, last name, reason, and a future
      time → the card appears in time order.
- [ ] Try to pick a past time → the form blocks it.
- [ ] Book a second consultation at exactly the same time → conflict message
      (`409`).
- [ ] **Reschedule** to a new future time → the card updates.
- [ ] **Mark complete** → card shows "completed"; reschedule and cancel
      disappear.
- [ ] **Cancel** another consultation → confirmation dialog → card shows
      "cancelled" and has no actions.
- [ ] Book the same time as the cancelled one → succeeds.
- [ ] Open two tabs, reschedule in one, then act on the same card in the other
      → stale-update conflict (`409`). Retrying after refresh works.
- [ ] Visit `/admin/consultations` as a student → redirected back to
      `/student/consultations`.

### Admin

- [ ] Provision an admin as described in the README, then sign in →
      redirected to `/admin/consultations`.
- [ ] The table shows every student's consultations. Scheduled rows show
      **Incomplete**.
- [ ] There are no booking or edit controls. Visiting `/student/consultations`
      redirects back to `/admin/consultations`.

### API security spot checks

Use any HTTP client. Replace `<id>` with a real consultation ID.

- [ ] `GET /api/consultations` with no cookies → `401` JSON.
- [ ] `POST /api/consultations` with a session but with
      `Origin: https://evil.example` → `403 ORIGIN_NOT_ALLOWED`.
- [ ] `PATCH /api/consultations/<another student's id>` as a student →
      `404`, because RLS hides the row.
- [ ] Response headers include `Cache-Control: private, no-store`.
