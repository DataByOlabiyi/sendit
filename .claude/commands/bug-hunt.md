# /bug-hunt — Systematic Bug Hunt

Scans a codebase area for bugs, ranks them by severity, and proposes fixes one at a time — waiting for explicit approval before applying each.

## Usage

```
/bug-hunt [area]
```

- `area` can be a file path, a directory, a feature name, or a description like "the payment flow" or "auth actions".
- If no area is specified, scan the entire codebase with a focus on high-risk zones first.

## What this command does

Uses the **bug-hunter** agent role:

### Step 1 — Scan

Read every relevant file in the specified area. Do not skip files. For a broad scan, prioritise in this order:
1. Payment routes and actions (`apps/web/src/app/api/paystack/`, `apps/web/src/app/book/actions.ts`)
2. Auth actions (`apps/web/src/app/auth/actions.ts`)
3. Rider actions (`apps/web/src/app/rider/actions.ts`)
4. Rider dispatch (`apps/web/src/lib/rider-dispatch.ts`)
5. Supabase migrations (`supabase/migrations/`)
6. Order tracking and status flows
7. Shared packages (`packages/validations/`)

### Step 2 — Present the full ranked list

Output the complete bug report before touching any code:

```
## Bug Report: <Area>

### CRITICAL
1. <title> — path/to/file.ts:line
   Impact: ...

### HIGH
...

### MEDIUM
...

### LOW
...

Total: X bugs (C critical, H high, M medium, L low)
```

**Do not edit any file at this step.**

### Step 3 — Propose fix for the top bug only

```
## Fix #1: <title>

File: `path/to/file.ts`
Lines: <range>

Current code:
...

Proposed change:
...

Why: ...

Proceed? (yes to apply)
```

**Wait for explicit "yes" before applying.**

### Step 4 — Apply and repeat

After each approved fix:
- Apply it
- Confirm what changed
- Move to the next bug in the list
- Propose fix, wait for yes, repeat

## Priority areas for SendIt

Always check these even if a specific area is given:
- Payment idempotency and kobo-correctness
- `forgotPasswordAction` email enumeration guard
- Order state machine transition guards
- Server Action / API route input validation (Zod)
- Service-role client not leaking to client-side
- RLS policies not accidentally widened
