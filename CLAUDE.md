# SendIt — Claude Working Instructions

## Project

SendIt is an on-demand delivery platform targeting the Nigerian market (NGN currency). It is a **solo project** — there are no teammate conventions to honour. You are working directly with the owner/developer.

GitHub: https://github.com/DataByOlabiyi/sendit

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Auth + DB | Supabase (PostgreSQL + PostGIS, RLS, Realtime) |
| State | Zustand (auth), TanStack Query (server state) |
| Forms | react-hook-form + Zod (shared via `@sendit/validations`) |
| Payments | Paystack (NGN, kobo amounts) |
| Maps | Google Maps API (degrades gracefully without key) |
| Deployment | Vercel (two projects: `apps/web`, `apps/admin`) |
| Error Monitoring | Sentry (@sentry/nextjs, separate DSN per app) |

---

## Monorepo Structure

```
sendit/
├── apps/
│   ├── web/    (@sendit/web)   — Customer PWA + Rider app
│   └── admin/  (@sendit/admin) — Admin dashboard
├── packages/
│   ├── types          — shared TypeScript types
│   ├── constants      — shared constants (PLATFORM_COMMISSION etc.)
│   ├── validations    — Zod schemas (createOrderSchema, addressSchema …)
│   ├── utils          — shared helpers
│   └── ui             — shared React components
└── supabase/
    ├── migrations/    — SQL migrations (apply in order; never edit past ones)
    └── seed.sql
```

Shared components in `packages/ui` are consumed by **both** `apps/web` and `apps/admin`. Any change to a shared component must be verified against both apps before marking work done.

---

## High-Risk Zones — Handle with Extra Care

Any change touching the following areas requires explicit review and sign-off before committing:

1. **Payments** — Paystack initialize/verify/webhook routes, `book/actions.ts` payment flow. Rules: always check idempotency (existing-pending guard before insert); verify Paystack amount in kobo matches stored `total_fee`; status guard `.eq('status','pending')` on every payment state update to prevent double-processing.

2. **Location / GPS** — rider location endpoint (`/api/rider/location`), `order_tracking` table writes, Google Maps integration. PostGIS columns must receive valid lat/lng (lat: −90..90, lng: −180..180 — enforced in `createOrderSchema`).

3. **RLS Policies** — any `supabase/migrations/` change. The existing security model: users can only see/mutate their own rows; `is_admin()` function gates admin operations; anon key can never insert notifications or access proof-of-delivery outside their assigned order. **Never loosen a policy without documenting the reason.**

4. **Storage Policies** — `proof-of-delivery` and `chat-attachments` buckets are scoped to order parties. Do not widen bucket access.

5. **Order State Machine** — valid transition path: `pending → accepted → picked_up → in_transit → delivered`. Cancellation is allowed from `pending / accepted / picked_up / in_transit`. `delivered` and `cancelled` are terminal. The DB trigger `enforce_order_status_transition` enforces this — never bypass it.

6. **Admin Privilege** — the `handle_new_user` trigger only allows `'customer'` or `'rider'` roles via signup metadata. Never allow `'admin'` through a client-facing path.

7. **Rate Limiting** — entry points: `apps/web/src/lib/rate-limit.ts` (Upstash Redis). Never rate-limit the Paystack webhook route (`/api/paystack/webhook`) — Paystack servers are the caller and have no user session. New limiters must key on authenticated user ID, not IP (Nigerian mobile NAT makes IP-based limits unreliable).

---

## Regression-Sensitive Paths

Changes anywhere near these flows require manual smoke-test confirmation (or automated tests) before the task is marked done:

- **Checkout flow** — `apps/web/src/app/book/` (4-step booking: pickup → delivery → summary → payment)
- **Delivery tracking** — `apps/web/src/app/track/` and `apps/web/src/app/rider/` order status lifecycle
- **Auth flows** — login, register, forgot-password, password-reset (forgot-password must never reveal whether an email exists)
- **Rider dispatch** — `apps/web/src/lib/rider-dispatch.ts` (idempotent; called from verify and webhook)

---

## Hard Rules

- **No `'admin'` role via client signup.** DB trigger enforces this; do not work around it.
- **Never revert security patterns from the June 2026 hardening pass.** See `.claude/agents/` comments for full list.
- **Payment amounts are always in kobo.** Never store or compare NGN naira directly in the payment layer.
- **Server-side Zod validation is required** on every Server Action and API route that accepts user input.
- **Service-role Supabase client** (`apps/web/src/lib/supabase/admin.ts`) is for server-side code only — never import it in a Client Component or expose it to the browser.
- **Shared package changes** must not break either `apps/web` or `apps/admin` — run `pnpm turbo type-check` after every shared package edit.
- **New migrations** go in `supabase/migrations/` with a timestamp prefix. Never edit an already-applied migration.
- **No comments that describe what the code does.** Only add a comment when the *why* is non-obvious (hidden constraint, workaround, subtle invariant).
- **New DB indexes** go in a dedicated migration file with timestamp prefix. Always use `CREATE INDEX IF NOT EXISTS`; never edit a prior migration to add an index.

---

## Known Tech Debt (Tier 3 — do not accidentally "fix" without a plan)

*Last audited 2026-07-14. Previously listed items that are now implemented — do not re-implement: wallet backend (`/api/wallet/*`), web-push notifications (`packages/notifications`), chat pagination (`use-realtime-chat.ts`), `PLATFORM_COMMISSION` applied via `computeCommissionSplit`, admin analytics dashboard.*

- Admin middleware: DB round-trip per request. Deliberate — the custom JWT role claim migration exists (`20240612000001`) but `apps/admin/src/middleware.ts` intentionally does not trust it. Future fix requires a decision to trust server-set `app_metadata`.
- Cash/COD: rider confirmation flow not verified end-to-end.
- No E2E test suite (Playwright) — regression-sensitive paths still rely on manual smoke tests.

---

## Default Workflow — NON-TRIVIAL FEATURES

**For any non-trivial feature request, run the full PM → Planner → Designer → Engineer → Tester → Reviewer sequence automatically, even if the user does not type `/feature`.**

A request is non-trivial if it involves more than a typo fix, a one-line config tweak, or a rename. When in doubt, treat it as non-trivial.

Skip straight to implementation **only** if the user explicitly says "skip the workflow" or the change is obviously trivial.

### Sequence

1. **PM** — clarify requirements, write acceptance criteria, define scope (what's in / out), identify edge cases. Output a short requirements block.
2. **Planner** — translate requirements into a technical plan: files to create/modify, approach, order of operations, risk flags. Output a plan block.
3. **Designer** *(skip if no UI change)* — component structure, layout decisions, Tailwind approach, mobile-first, shared component audit. Output a design block.
4. **Engineer** — implement exactly what the plan specifies. No scope creep. No unrequested cleanup.
5. **Tester** — write test cases or a manual test checklist covering the golden path and known edge cases. Flag regression-sensitive paths.
6. **Reviewer** — review the diff for correctness bugs, security patterns (RLS, payment guards, Zod validation), and consistency with the codebase conventions.

Present the output of each stage inline, then move to the next. Pause after **Reviewer** for final approval before marking done.

---

## Default Workflow — BUGS

**If the user asks you to find or fix bugs without specifying a method, default to bug-hunter behavior:**

1. Scan the described area (or the whole codebase if unspecified).
2. Rank every bug found by severity: Critical → High → Medium → Low.
3. Present the ranked list with a one-sentence description of each bug and its impact.
4. Propose a fix for the **top-severity bug only**, explain the change, and **wait for explicit yes** before applying it.
5. After each fix is confirmed and applied, move to the next bug in the list.

Do **not** apply multiple fixes at once. Do **not** dive into editing before presenting the ranked list.

---

## Definition of Done

A task is complete when **all** of the following are true:

- [ ] TypeScript type-check passes (`pnpm turbo type-check`)
- [ ] Linter passes (`pnpm turbo lint`)
- [ ] Shared package changes verified in both `apps/web` and `apps/admin`
- [ ] Regression-sensitive paths smoke-tested (manual checklist or automated test)
- [ ] No new RLS policies looser than existing ones (or explicit justification)
- [ ] Payment flows verified for idempotency and kobo-correctness
- [ ] No `console.log` / debug artefacts left in code
- [ ] Migration files (if any) have correct timestamp prefix and do not edit prior migrations
