# SendIt

An on-demand delivery platform built for the Nigerian market. Customers book pickups, riders fulfil deliveries, and admins manage the whole operation — all in real time.

## User roles

| Role | App | Access |
|---|---|---|
| **Customer** | `apps/web` (port 3000) | Book deliveries, track orders, manage addresses & profile |
| **Rider** | `apps/web` (port 3000) | Accept/reject orders, update delivery status, view earnings |
| **Admin** | `apps/admin` (port 3001) | Manage users, riders, orders, and platform settings |

Customer and Rider share the same Next.js app (`apps/web`) under separate route groups. The Admin dashboard is a fully separate app with its own auth guard — only users with the `admin` role in the database can access it.

## What's in this repo

```
sendit/
├── apps/
│   ├── web/          — Customer & Rider PWA (port 3000)
│   └── admin/        — Admin dashboard (port 3001)
├── packages/
│   ├── types/        — Shared TypeScript interfaces & enums
│   ├── constants/    — Pricing tiers, route paths, storage bucket names
│   ├── validations/  — Zod schemas with inferred types
│   ├── utils/        — Pricing calculator, formatters, haversine distance
│   └── ui/           — Shared React components (StatusBadge, LoadingSpinner, etc.)
└── supabase/
    ├── migrations/   — SQL migrations (schema → RLS → storage → patches)
    └── seed.sql
```

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Auth & database | Supabase (PostgreSQL + PostGIS, RLS, Realtime) |
| Client state | Zustand (auth), TanStack Query (server state) |
| Forms | react-hook-form + Zod |
| Payments | Paystack (NGN) |
| Maps | Google Maps API (degrades gracefully without a key) |

## Prerequisites

- Node ≥ 20
- pnpm ≥ 9 — `npm i -g pnpm`
- [Supabase CLI](https://supabase.com/docs/guides/cli) — for running migrations locally
- A Supabase project (free tier is fine)
- A Paystack account (test keys work for local dev)

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Copy the example files and fill in your keys:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

To find your Supabase keys: open your project in the [Supabase dashboard](https://supabase.com/dashboard) → **Project Settings → API**. You'll find the project URL, anon key, and service role key there.

See [Environment variables](#environment-variables) below for what each key does.

### 3. Run database migrations

```bash
supabase db push
# or, against a local Supabase instance:
supabase start
supabase db reset
```

### 4. Start the dev servers

```bash
pnpm dev          # starts both apps in parallel via Turborepo
```

| App | URL |
|---|---|
| Customer / Rider PWA | http://localhost:3000 |
| Admin dashboard | http://localhost:3001 |

## Environment variables

### `apps/web/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — server-side only, never expose to the client |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JS API key (optional — falls back to plain text inputs) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key (use test key locally) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key — server-side only |
| `NEXT_PUBLIC_APP_URL` | Full URL of the web app, e.g. `http://localhost:3000` |

### `apps/admin/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same service role key |
| `NEXT_PUBLIC_APP_URL` | Full URL of the admin app, e.g. `http://localhost:3001` |

## Common commands

```bash
pnpm dev           # start all apps in watch mode
pnpm build         # production build of all apps & packages
pnpm type-check    # tsc --noEmit across the whole monorepo
pnpm lint          # ESLint across all workspaces
pnpm format        # Prettier over all .ts/.tsx/.md files
pnpm clean         # remove all .next / dist build artifacts
```

## Database

The Supabase schema covers 10 tables:

`users` · `riders` · `addresses` · `orders` · `order_tracking` · `payments` · `payment_methods` · `notifications` · `chat_messages` · `reviews`

Row Level Security is enabled on every table. Storage buckets: `profile-images`, `rider-documents`, `proof-of-delivery`, `chat-attachments`.

## Admin access

The admin dashboard requires the authenticated user to have `role = 'admin'` in the `users` table. To grant yourself admin access locally, run this in the Supabase SQL editor after signing up:

```sql
update public.users
set role = 'admin'
where id = '<your-user-id>';
```

Your user ID can be found in **Authentication → Users** in the Supabase dashboard.

## Troubleshooting

**Map doesn't load / inputs show as plain text fields**
This is expected when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not set. The app falls back to plain text address inputs and uses default Lagos coordinates. Add a valid Maps API key to enable autocomplete and the delivery map.

**`pnpm dev` only starts one app**
Make sure you're running `pnpm dev` from the **repo root**, not inside one of the `apps/` folders. Turborepo at the root starts both apps in parallel.

**Type errors after pulling new changes**
Run `pnpm install` first — a new shared package dependency may have been added. Then `pnpm type-check` to confirm everything is clean.

## Contributing

1. Run `pnpm type-check` and `pnpm lint` before opening a PR — the monorepo must pass both with zero errors.
2. Keep changes scoped: shared logic belongs in `packages/`, app-specific code stays in `apps/`.
3. Any new database changes need a migration file in `supabase/migrations/` — don't edit existing migrations.

## Status & roadmap

| Phase | Status | Scope |
|---|---|---|
| 1 — Scaffold | Done | Monorepo setup, shared packages, DB schema, RLS, auth middleware |
| 2 — Customer UI | Done | Auth pages, booking flow (4 steps), order history, profile, addresses |
| 3 — Payments & Maps | Done | Paystack integration, Google Maps with graceful fallback, order creation |
| 4 — Rider dashboard | In progress | Accept/reject orders, status lifecycle, location tracking, Realtime |
| 5 — Live tracking | Planned | Customer-facing `/track/[id]` with Supabase Realtime subscriptions |
| 6 — Notifications | Planned | Push + in-app notifications for order events |
