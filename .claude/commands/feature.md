# /feature — Full Feature Workflow

Runs the complete PM → Planner → Designer → Engineer → Tester → Reviewer sequence for a new feature.

## Usage

```
/feature <description of what you want to build>
```

## What this command does

Takes the feature description and runs each role in sequence, presenting output at every stage and pausing for approval where noted.

---

### Stage 1 — PM (Requirements)

Using the **pm** agent role:

- Clarify the requirement
- Write acceptance criteria
- Define scope in / out
- Identify edge cases and open questions
- Flag high-risk areas (payments, RLS, GPS, state machine)

Present the requirements block. **Pause if there are open questions** — resolve them before proceeding.

---

### Stage 2 — Planner (Technical Plan)

Using the **planner** agent role:

- Translate requirements into a file-level implementation plan
- List files to create and modify with purpose
- Define order of operations
- Assign risk flags (HIGH / MED / LOW)

Present the plan block. If any HIGH-risk flag is raised (payment, RLS, state machine), note it explicitly before continuing.

---

### Stage 3 — Designer (UI/UX) — *skip if no visible UI change*

Using the **designer** agent role:

- Component breakdown with props shapes
- Shared component audit (reuse from `packages/ui` first)
- Mobile-first layout and Tailwind guidance
- States to design for (loading, empty, error, success)

Present the design block.

---

### Stage 4 — Engineer (Implementation)

Using the **engineer** agent role:

Implement exactly what the plan and design spec describe. Adhere to all hard rules:
- Zod validation on every Server Action and API route
- Payment idempotency and kobo-correctness
- Order state machine guards
- No service-role client in Client Components
- New migrations with timestamp prefix

Present a concise implementation summary (files created/modified, key decisions).

---

### Stage 5 — Tester (Test Plan)

Using the **tester** agent role:

- Write automated test cases where practical
- Write manual smoke-test checklist for the golden path and edge cases
- List regression checks for sensitive paths (checkout, tracking, auth, rider dispatch)

Present the test plan. Flag any test that must pass before marking the feature done.

---

### Stage 6 — Reviewer (Code Review)

Using the **reviewer** agent role:

Review the implementation diff for:
- Security issues (BLOCKER)
- Payment guard violations (BLOCKER / HIGH)
- RLS issues (HIGH)
- Input validation gaps (HIGH)
- Convention inconsistencies (MED / LOW)

Present findings with severity. If there are BLOCKER or HIGH findings, loop back to the Engineer before marking done.

---

### Done

The feature is done when:
- Reviewer verdict is APPROVE
- All BLOCKER and HIGH findings are resolved
- Definition of Done checklist in CLAUDE.md is satisfied
