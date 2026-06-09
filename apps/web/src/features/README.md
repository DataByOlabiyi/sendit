# Feature Modules

Each subfolder owns all logic for a single product domain.

| Feature | Owns |
|---|---|
| `orders/` | Order lifecycle (create, cancel, status transitions, OTP) |
| `payments/` | Paystack integration, payment initialization, verification |
| `tracking/` | Live map, order tracking history, location hooks |
| `rider/` | Rider-specific UI, onboarding, earnings, online toggle |
| `auth/` | Login, register, password reset, session |
| `disputes/` | Dispute submission and status display |
| `notifications/` | In-app notifications list, push subscription, badge |

## Rules

1. Code inside a feature folder may import from `@sendit/*` packages and `@/lib/`.
2. Code inside a feature folder must NOT import from another feature folder.
3. Shared primitives (used by 3+ features) belong in `@sendit/ui` or `@/components/ui/`.
4. App router pages (`app/`) import from feature modules — not the other way around.

## Migration status

Feature modules are currently empty scaffolds. Components, actions, and hooks
are still in `components/`, `app/*/actions.ts`, and `hooks/` respectively.
Migration happens incrementally — move code to the matching feature folder as
you touch each file. Do not do a big-bang migration.
