# Mini LMS

A full-stack technical assessment for a lightweight learning management system,
using Next.js App Router, TypeScript, Supabase Auth/PostgreSQL, and shadcn/ui
components with Tailwind CSS.

## Current status

This repository is still in the foundation stage and is **not yet a complete
assessment submission**.

Implemented:

- Supabase email/password sign-up, login, logout, and password reset.
- Cookie-based Supabase SSR clients and Next.js proxy session refresh.
- Server-side authentication check for the protected dashboard.
- Safe internal redirects after email confirmation.
- Local Supabase CLI configuration and development instructions.

Not implemented:

- Consultation schema, migrations, or seed data.
- Student consultation dashboard and booking form.
- Consultation completion, rescheduling, and cancellation.
- Admin role management and the read-only all-consultations view.
- Consultation API routes, authorization policies, and RLS.

The `/protected` page is currently an authenticated placeholder. Complete the
missing features above before presenting the project as satisfying the brief.

## Local setup

Requires nvm, Node.js 22.13 or newer, npm, and Docker Desktop running. The
committed `.nvmrc` selects Node 22; `.npmrc` enforces the minimum Node version.

```bash
nvm use
npm ci
cp .env.example .env.local
docker network create -o 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' mini-lms-local
npx supabase start --network-id mini-lms-local
```

Create the Docker network once. Keep using `--network-id mini-lms-local` whenever
you start the local stack so its published ports bind to localhost. If the
network already exists, skip the `docker network create` command.

Run `npx supabase status` and copy the local API URL and publishable (or anon)
key into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-publishable-key>
```

Never commit `.env.local`, secret keys, or signing secrets. Local Supabase uses
development-default keys and its Studio/admin services do not require
authentication. Use test data only; never expose the local stack publicly or use
it for production.

Run the app at `http://localhost:3000`:

```bash
npm run dev
```

The local Supabase Auth configuration in `supabase/config.toml` allows exact
redirects to `/protected` and `/auth/update-password` on that origin. Keep the
app hostname consistent (`localhost`, not `127.0.0.1`). Email confirmation is
disabled locally; password reset messages are captured by Mailpit.

| Service         | Local URL                |
| --------------- | ------------------------ |
| Next.js app     | <http://localhost:3000>  |
| Supabase API    | <http://127.0.0.1:54321> |
| Supabase Studio | <http://127.0.0.1:54323> |
| Mailpit         | <http://127.0.0.1:54324> |

Restart Supabase without deleting its local data:

```bash
npx supabase stop
npx supabase start --network-id mini-lms-local
```

## Assessment approach

The implementation is intended to address the assessment's core criteria:

- **Secure access:** use the cookie-bound Supabase session for identity, enforce
  authorization in API handlers, and back it with PostgreSQL RLS. Students may
  only read or change their own consultations; admins may read all consultations.
- **Roles:** keep roles in a database table controlled by trusted provisioning,
  not in user-editable metadata. Check the role server-side before admin access.
- **API-first design:** implement booking and consultation changes with Next.js
  Route Handlers rather than Server Actions, with server-side input validation.
- **Consistency and scalability:** store timestamps as `timestamptz`, index
  common ownership/date queries, and keep persistence and business rules out of
  presentation components.
- **Reproducibility:** keep schema changes in ordered SQL migrations and document
  how to apply them and generate matching TypeScript database types.

These are design intentions, not claims that the currently missing LMS features,
policies, or migrations already exist.

## Proposed assumptions

Confirm these when implementing the consultation workflows:

- Cancellation marks a consultation as cancelled instead of deleting its history.
- Booking and rescheduling require a future date/time.
- Cancelled consultations cannot be rescheduled or completed.
- Times are stored as absolute `timestamptz` values and displayed in the user's
  local timezone.
- Tutor allocation, availability calendars, appointment duration, and
  double-booking rules are outside scope unless added explicitly.

## Database and migrations

**No application schema migration or seed data exists yet.** The current
`supabase/config.toml` configures only the local development services and Auth
redirect URLs. Production Supabase Auth URLs belong in the hosted project's
dashboard; do not push the local URLs as production configuration.

When schema work begins, create migrations with:

```bash
npx supabase migration new create_lms_schema
npx supabase db reset
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

The migration files should define the profiles/roles and consultations tables,
constraints, indexes, grants, and RLS policies. `db reset` recreates the local
database from migrations and configured seed files; it discards manual local
database changes.

## Production configuration

Use a separate hosted Supabase project. Set its URL and publishable key as
deployment environment variables. Configure the production Site URL and exact
HTTPS auth redirect URLs in **Supabase → Authentication → URL Configuration**.
The committed local CLI configuration is for `supabase start`, not production
application configuration. Apply database migrations to the hosted project
only after reviewing them.

## Development checks

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

`npm run lint:fix` applies safe ESLint fixes; `npm run format` formats files and
orders Tailwind classes. ESLint uses the Next.js presets, type-aware
typescript-eslint strict/stylistic presets, project-specific import restrictions,
and import sorting.
