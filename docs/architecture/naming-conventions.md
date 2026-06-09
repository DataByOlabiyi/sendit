# SendIt Architecture Decision Record: Naming Conventions & Structure

## Status
Active — enforced for all new code as of June 2026.

---

## 1. Component Naming

### Rule
All React components use `{Domain}{Role}.tsx` naming — PascalCase with a domain prefix.

### Examples
| Good | Bad |
|---|---|
| `CustomerSidebar.tsx` | `sidebar.tsx` |
| `RiderOrdersList.tsx` | `orders-list.tsx` |
| `CancelOrderButton.tsx` | `cancel-button.tsx` |
| `AdminSidebar.tsx` | `admin/sidebar.tsx` |
| `RealtimeStatusBanner.tsx` | `realtime-connection-banner.tsx` |

### Why
Generic names (`sidebar`, `modal`, `form`) become ambiguous as soon as a second
instance is needed. Domain-prefixed names are grep-discoverable and self-document
where the component belongs.

---

## 2. Server Action Naming

### Rule
All Next.js Server Actions use `{verb}{Noun}Action` — camelCase, explicit domain noun, `Action` suffix.

### Examples
| Good | Bad |
|---|---|
| `createOrderAction` | `createOrder` |
| `saveRiderBankAccountAction` | `saveBankAccountAction` |
| `advanceOrderStatusAction` | `updateOrderStatusAction` |
| `markOrderReturnedAction` | `markReturnedAction` |
| `notifyNearbyRidersForOrder` | `dispatchRiderNotifications` |

### Why
The `Action` suffix marks server-side functions for engineers scanning component
files. The explicit noun (`RiderBankAccount` vs `BankAccount`) removes ambiguity
about which entity is being operated on.

---

## 3. File Naming

### Rule
- **React component files**: PascalCase (`CustomerSidebar.tsx`)
- **Non-component TypeScript files**: kebab-case (`order-actions.ts`, `sms-client.ts`)
- **Vendor/service client files**: `{vendor}-client.ts` (`paystack-client.ts`, `sms-client.ts`)
- **No generic names**: never create `utils.ts`, `helpers.ts`, `common.ts`, `data.ts` as standalone files

---

## 4. API Route Hierarchy

### Rule
All API routes follow `/{domain}/{action}` — never a bare verb at root level.

### Examples
| Good | Bad |
|---|---|
| `POST /api/payments/refund` | `POST /api/refund` |
| `PATCH /api/riders/location` | `PATCH /api/update-location` |
| `POST /api/orders/generate-otp` | `POST /api/otp` |
| `POST /api/disputes/update-status` | `POST /api/update` |

---

## 5. Database Table Naming

### Rule
All tables use **plural snake_case** nouns.

| Good | Bad |
|---|---|
| `rider_wallets` | `rider_wallet` |
| `admin_audit_logs` | `admin_audit_log` |
| `orders` | `order` |

### Rule
Named Postgres enum types (if introduced) mirror the TypeScript type names:
`order_status`, `payment_status`, `kyc_status`, `payout_status`.

---

## 6. Package Structure

### Rule
Shared packages (`@sendit/*`) must NOT have a monolithic `index.ts` as their
only source file. Each package splits exports by domain:

```
packages/utils/src/
├── pricing.ts      ← calculatePricing
├── formatting.ts   ← formatCurrency, formatDate, etc.
├── geo.ts          ← haversineDistance (canonical copy)
├── orders.ts       ← generateOrderReference
├── string.ts       ← truncate
└── index.ts        ← re-exports all (barrel — no logic)
```

The `index.ts` is a barrel only. Logic lives in named files.

---

## 7. Feature Module Boundaries

### Rule
New cross-cutting features (components + actions + hooks for a single domain)
go into `apps/web/src/features/{domain}/` — not into the existing flat `components/`
or `hooks/` directories.

### Import rules
- Feature modules import from: `@sendit/*`, `@/lib/`, `@/components/ui/`
- Feature modules must NOT import from other feature modules
- App router pages import from feature modules — not the reverse

### Current feature modules
```
features/
├── orders/        components/, actions/, hooks/
├── payments/      components/, actions/, services/
├── tracking/      components/, hooks/
├── rider/         components/, actions/, hooks/
├── auth/          components/, actions/
├── disputes/      components/
└── notifications/ components/, hooks/
```

---

## 8. Enforcement

These conventions are enforced by:
1. PR review — reviewers should reject PRs that introduce generic file names
2. This document — link in onboarding docs and CLAUDE.md
3. (Future) ESLint custom rule for component file naming

---

## Change Log

| Date | Change |
|---|---|
| 2026-06-09 | Initial ADR created during Phase 1/2 repository audit |
