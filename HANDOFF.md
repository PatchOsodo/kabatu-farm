# Kabatu Farm — Data-Wiring Handoff

This document is self-contained. Do not assume any prior chat history exists — verify everything below against the actual codebase as your first step, since this file itself can drift out of date the same way a previous handoff attempt did (see "Why this document exists" at the bottom).

## Step 0 — Verify before doing anything else

Before touching any code, run these and confirm the output matches what's claimed below. If it doesn't match, STOP and report the discrepancy instead of proceeding on a false premise.

```bash
ls pb_migrations/
ls lib/data/ lib/actions/
ls lib/mock/
grep -c "GUEST_READABLE_MODULES\|MODULE_ROLE_REQUIREMENTS" lib/authz.ts
npx tsc --noEmit
```

## Verified current state (confirmed by actually running the above)

- **Migrations**: `001_users_role_fields.js` through `005_users_username_field.js`. Collections that exist in PocketBase: `users` (extended with `role`, `enterprises`, `username`), `land_parcels`, `cattle`.
- **Data layer**: only `lib/data/cattle.ts` + `lib/actions/cattle.ts` exist. Every other module (`sheep`, `poultry`, `crops`, `financials`, `tasks`, `inventory`) is still 100% on `lib/mock/*.ts` — none of those PocketBase collections exist yet.
- **Access control — already built, do not rebuild**: `lib/authz.ts` defines `canAccessModule()`, `GUEST_READABLE_MODULES` (`dairy`, `sheep`, `poultry`, `crops` — guests can view, not edit), and `MODULE_ROLE_REQUIREMENTS` (`inventory`, `tasks`, `financials` require login + specific roles). `proxy.ts` enforces both at the route level already. **This system is real, tested, and working — the only remaining work per module is making PocketBase's own `listRule`/`viewRule` match it** (see `004_cattle_public_read.js` for the exact pattern to replicate).
- **Auth**: username + email dual login works (`005_users_username_field.js`).
- **`types/farm.ts`**: already has full interfaces for every domain object (`CropCycle`, `SheepFlock`, `PoultryFlock`, `FinancialTransaction`, `Task`, `HealthRecord`, etc.) from the original Phase 1 schema design — this almost certainly does NOT need new types, only wiring against what's already there. Confirm this before adding anything to it.
- **Open design question, not yet decided**: `HealthRecord` has no corresponding route or `ModuleKey` entry. Is health data its own page, or nested inside dairy/sheep/poultry detail views? Decide this explicitly before wiring it — don't default silently.

## The pattern to replicate (the "Cattle Pattern") — verify against the real files, not this description

Read `pb_migrations/003_cattle_collection.js`, `lib/data/cattle.ts`, and `lib/actions/cattle.ts` directly before starting each new module — copy their actual structure, not a paraphrase of it. Three things worth calling out explicitly because they were real bugs the first time:

1. **Self-referential relation fields** (e.g. `motherId`/`fatherId` on cattle) can't be added in the same `Collection` object at creation — PocketBase needs the collection's real ID first. Create the base collection, `app.save()`, re-fetch it, then add relation fields, `app.save()` again. See `003_cattle_collection.js`'s comment block for why.
2. **`redirect()` must never be inside a `try/catch`** in a Server Action — Next.js implements it via throw, so a catch block silently swallows every successful save. This was a real, shipped bug once already.
3. **Server-side PocketBase calls use `POCKETBASE_INTERNAL_URL`, not `NEXT_PUBLIC_POCKETBASE_URL`** — this is handled centrally in `lib/pb.ts`'s `createPocketBaseClient()` already; just use that function, don't construct a `new PocketBase(...)` client anywhere else.

## What's actually left (revised batching)

Batch by **one module at a time**, not by grouping 3–4 modules per batch. The reasoning for this override: this codebase has already hit several real, non-obvious bugs (async params in Next 15+, Docker network isolation for server-side fetches, migration relation-field ordering, missing `createdAt`/`updatedAt` on mock data) that only surfaced through actually building and testing — not through code review. A batch of 3–4 modules with no verification checkpoint between them risks compounding an undetected mistake across all of them, the same way the original handoff attempt claimed a module "complete" that wasn't.

**Per module, in this order** (dairy supporting records first, since dairy already has a real collection to attach to; then whichever of sheep/poultry/crops/financials/tasks/inventory you choose next):

1. Write the migration(s) for that module's collection(s), following the Cattle Pattern.
2. Run `pocketbase migrate up` against a **real local PocketBase instance** — not just eyeball the JS for syntax correctness. Confirm with `pocketbase migrate up` output showing `Applied ...`, then actually query the collection via the REST API to confirm the schema landed as expected.
3. Write `lib/data/<module>.ts` and `lib/actions/<module>.ts`.
4. Wire the real app pages/components to the new data layer, replacing the mock import.
5. Update `004_cattle_public_read.js`-style `listRule`/`viewRule` changes if this module is in `GUEST_READABLE_MODULES`, or role-restricted `createRule`/`updateRule`/`deleteRule` matching `MODULE_ROLE_REQUIREMENTS` if it's a sensitive module.
6. Delete `lib/mock/<module>.ts` only after step 4 is confirmed working — not before.
7. Run `npx tsc --noEmit` AND a full `npm run build` — both, not just one.
8. **If at all feasible, do a real end-to-end smoke test**: seed a record via the PocketBase API, build the app, start it, hit the real page, confirm the real data renders. This is how the dairy server/client URL bug and the poultry `createdAt` bug were actually caught — type-checking alone did not catch either.
9. Report status and stop for confirmation before starting the next module. Do not chain multiple modules in one unreviewed pass.

## `pb_hooks` (alerts engine) — treat as higher-risk, separate from the above

PocketBase JS hooks (`pb_hooks/*.pb.js`) are a genuinely different mechanism from migrations — they run inside PocketBase's own JS runtime at request/event time, not as one-off schema changes. Nothing in this codebase has used them yet. Do not bundle this into a module batch; treat it as its own explicit step, after the modules it depends on (`inventory_items`, `expiration_batches`) are wired and verified, with its own real-hook-firing test (create a low-stock record, confirm an alert actually gets written) before considering it done.

## Quarantine module (Phase 2.1)

Explicitly out of scope until every module above is wired, verified, and confirmed working in a real deployed environment — not just locally. Don't start on it early "while waiting," since it depends on `health_records` existing, which depends on the open design question above being resolved first.

## Every prior handoff attempt's mistake to not repeat

A previous status document claimed migrations `010`–`018` existed and Module 1 (Inventory) was complete. Neither was true in the actual uploaded code. **Never write "Completed"/"Verified" in a status update without having just run the actual verification command and seen its output in that same session.** Confidence in a written summary is not evidence; command output is.
