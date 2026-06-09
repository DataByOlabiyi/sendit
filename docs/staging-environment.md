# Staging Environment Setup

## Architecture

SendIt uses two separate Supabase projects:

| Environment | Purpose |
|-------------|---------|
| **Production** | Live customer data, real Paystack transactions |
| **Staging** | Pre-release testing, Paystack test keys, seeded data |

## Setup Steps

### 1. Create a staging Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project named `sendit-staging`
2. Apply all migrations: `supabase db push --project-ref <staging-ref>`
3. Deploy all Edge Functions: `supabase functions deploy --project-ref <staging-ref>`

### 2. Environment variables

Create `.env.staging` in the repo root (git-ignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

# Paystack test keys (starts with sk_test_ / pk_test_)
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...

# Google Maps — same key works for both environments
GOOGLE_MAPS_API_KEY=...

# Termii sandbox
TERMII_API_KEY=<termii-test-key>

# VAPID keys (generate once with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:test@senditmoves.com
```

### 3. Run apps against staging

```bash
# Web app
NEXT_PUBLIC_SUPABASE_URL=$(cat .env.staging | grep SUPABASE_URL | cut -d= -f2) pnpm dev

# Or use dotenv-cli:
dotenv -e .env.staging -- pnpm dev
```

### 4. Seed staging data

```bash
supabase db reset --project-ref <staging-ref>   # apply migrations fresh
# Then run seed script:
supabase db execute --project-ref <staging-ref> --file supabase/seed.sql
```

### 5. Vercel preview deployments

In the Vercel dashboard, configure a `Preview` environment that uses `.env.staging` values.
All branches/PRs automatically get a preview deployment pointing at staging Supabase.

## Paystack test cards

| Scenario | Card number | CVV | Expiry |
|----------|-------------|-----|--------|
| Success | 4084 0840 8408 4081 | 408 | 01/25 |
| Declined | 4084 0840 8408 4081 | 000 | 01/25 |
| Insufficient funds | 5531 8866 5214 2950 | 564 | 09/32 |

## USSD test flow (Paystack sandbox)

In the Paystack test dashboard, any USSD transaction can be manually approved under "Transactions → Pending".
