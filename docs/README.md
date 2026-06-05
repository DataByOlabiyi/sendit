# SendIt

A production-ready on-demand delivery marketplace platform.

## Architecture

Turborepo monorepo with two Next.js 15 PWA applications sharing common packages.

```
sendit/
├── apps/
│   ├── web/          # Customer + Rider PWA (port 3000)
│   └── admin/        # Admin Dashboard (port 3001)
└── packages/
    ├── types/        # TypeScript interfaces
    ├── constants/    # Pricing, routes, config
    ├── validations/  # Zod schemas
    ├── utils/        # Shared utilities
    └── ui/           # Shared components
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payments**: Paystack
- **Maps**: Google Maps Platform
- **State**: Zustand + TanStack Query
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
# Fill in your keys

# Push database migrations
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Start development
pnpm dev
```

## Key Features

**Customer App**
- Book deliveries with Google Maps address search
- Real-time order tracking with live rider GPS
- In-app chat with rider
- Paystack card payments or cash
- Push notifications for order updates

**Rider App**
- Accept/reject available orders
- GPS location tracking during delivery
- Proof of delivery photo upload
- Earnings dashboard

**Admin Dashboard**
- Rider approval workflow
- User and order management
- Analytics with revenue charts
- Broadcast notifications
- Platform settings

## Deployment

See [docs/DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions.
