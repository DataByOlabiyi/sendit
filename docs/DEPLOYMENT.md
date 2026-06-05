# SendIt Deployment Guide

## Prerequisites

- Vercel account with two projects: `sendit-web` and `sendit-admin`
- Supabase project with all migrations pushed
- Google Maps API key with Places API and Maps JavaScript API enabled
- Paystack account with live keys

---

## Environment Variables

### apps/web (Vercel Project: sendit-web)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (server only) |
| `NEXT_PUBLIC_APP_URL` | Production URL e.g. https://web.sendit.com |

### apps/admin (Vercel Project: sendit-admin)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same service role key |
| `NEXT_PUBLIC_APP_URL` | Admin URL e.g. https://admin.sendit.com |

---

## Deployment Steps

### 1. Push database migrations

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 2. Deploy web app

```bash
cd apps/web
vercel --prod
```

Or connect the GitHub repo to Vercel and set root directory to `apps/web`.

### 3. Deploy admin app

```bash
cd apps/admin
vercel --prod
```

Or connect the same GitHub repo to a second Vercel project with root directory `apps/admin`.

### 4. Configure custom domains

In Vercel dashboard:
- `sendit-web` — add domain `web.sendit.com`
- `sendit-admin` — add domain `admin.sendit.com`

Update `NEXT_PUBLIC_APP_URL` in both projects after domains are set.

### 5. Update Supabase Auth settings

In Supabase dashboard — Authentication — URL Configuration:
- Site URL: `https://web.sendit.com`
- Redirect URLs: add `https://web.sendit.com/auth/reset-password`

### 6. Enable Supabase Realtime

In Supabase dashboard — Database — Replication:
Enable realtime for these tables:
- `orders`
- `riders`
- `chat_messages`
- `notifications`
- `order_tracking`

---

## Post-Deployment Checklist

- [ ] Both apps accessible at their domains
- [ ] Auth flow works (register, login, reset password)
- [ ] Supabase Realtime enabled for required tables
- [ ] Google Maps loads correctly
- [ ] Paystack payment flow works with live keys
- [ ] PWA install prompt appears on mobile
- [ ] Service worker registers successfully
- [ ] Admin panel accessible only to admin role
- [ ] Create first admin user via Supabase CLI:

```bash
supabase auth admin create-user \
  --email admin@yourdomain.com \
  --password YourSecurePassword123! \
  --email-confirm

# Then update the users table to set role = 'admin'
```
