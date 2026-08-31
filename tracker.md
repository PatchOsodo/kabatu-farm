
(023 is the highest-numbered migration currently in the repo — 019–023 cover photo upload fields, quarantine zero-value fixes, milk_logs autodate fields, and sheep/poultry zero-value fixes. See individual migration files for details; not re-summarized here since they predate this tracker update and weren't touched by it.)

### Bugs found and fixed (all confirmed against a live instance, not just reasoned about)

1. **Date-equality comparisons silently broken everywhere** — PocketBase stores `date` fields as full timestamps, not the plain `YYYY-MM-DD` the `ISODate` type promises. Fixed once at the data-layer boundary (every `get*` function normalizes dates).
2. **Wool-harvest quick-entry form had no field for `sheepShorn`** (a required count) — added the missing input rather than defaulting it to `0`.
3. **PocketBase rejects `0` on `required: true` number fields** — a real, product-breaking bug: setting `inventory_items.currentQuantity` to exactly `0` (ordinary "ran out of stock") failed validation. Fixed via `015_inventory_zero_value_fix.js`. The same bug also affected `crop_cycles.actualYieldToDateKg`, fixed via `017`, and recurred a further three times (sheep_flocks, lactation_cycles, poultry_flocks) — see migrations `020`/`022`/`023`.
4. **`land_parcels` wasn't guest-readable despite belonging to the guest-readable "crops" module** — fixed via `016_land_parcels_public_read.js`.
5. **`feed_consumption_logs` write access too narrow for how the module is actually used** — broadened via `018`.
6. **Crops log form always recorded input applications in `kg`** regardless of what was actually applied — fixed with inventory-item-linked unit auto-fill.
7. **6 of 7 `lib/mock/*.ts` files were still on disk** despite being fully unwired — deleted.

### Phase 2.1 (Quarantine) — schema landed, UI live for cattle and poultry

`health_records` extended additively with `withdrawalDaysMilk`, `withdrawalDaysMeat`, `quarantineUntilDate`. Cattle and poultry quarantine UI fully live-tested against a real seeded record and a real standalone server build. Sheep-side quarantine UI is code-complete and structurally identical to the proven cattle/poultry pattern, but its live end-to-end test was cut short by a sandbox limitation in an earlier session — still flagged open below, unchanged by this update.

### Navigation unification & mobile dashboard (this update — build-verified, not live-verified)

Driven by an external UX review (see `CHATGPT.txt`) plus a follow-up discussion establishing the requirements. Scope: unify the previously-duplicated mobile navigation (a flat hamburger panel *and* a separate desktop sidebar showing the same 8 items) into a single grouped system, and rework the dashboard around quick actions and clearer hierarchy.

- **`lib/modules.ts`** — added `NAV_GROUPS`: Home / Farm / Ops / Money, grouping the existing 8 flat `NAV_ITEMS` in a way that intentionally lines up with the pre-existing guest-readable vs. role-gated split in `lib/authz.ts` (Farm = public tier; Ops/Money = authenticated tier). `NAV_ITEMS` itself untouched — `Sidebar.tsx` (desktop) still uses it directly, unmodified.
- **`components/layout/BottomNav.tsx`** (new) — fixed, mobile-only bottom bar rendering the 4 groups plus a floating central `+` button. Visibility per group uses the same `canAccessModule()` check `Sidebar.tsx` already used, so guest/role visibility stays in agreement across both surfaces without a second access-control implementation.
- **`app/farm/page.tsx`** (new) — a 4-tile picker (Dairy/Sheep/Poultry/Crops) so "Farm" in the bottom nav lands somewhere real instead of defaulting into `/dairy`. Added `/farm` to `proxy.ts`'s public exact paths (it's link-only, no data fetching of its own).
- **`components/layout/Topbar.tsx`** — removed the old mobile hamburger button and dropdown nav panel, now redundant with `BottomNav`. Desktop layout unchanged.
- **`BottomNav`'s central `+`** — opens a bottom sheet with the same four quick actions as the dashboard row (see below), reusing the identical `lib/authz.ts` permission functions so the two lists can't drift apart.
- **`app/page.tsx`** — three changes: (1) a quick-actions row (Log milk / Log eggs / Add expense / Add task) above the enterprise cards, each gated by the same permission function its destination page already enforces; (2) enterprise cards reworked to show net-this-month first and largest, with income/expense demoted to one small supporting line, instead of three co-equal rows; (3) enterprise cards with **zero underlying records** (no cattle/flocks/plots at all) now show a genuine empty state ("No {enterprise} activity yet" + a permission-gated "+ Add" button) — deliberately **not** applied to enterprises with real records but a `KES 0` net this month, since that zero may be masking not-yet-linked sales rather than genuine inactivity (see below).
- **`types/farm.ts` / `lib/data/dashboard.ts`** — added `hasRecords: boolean` to `EnterpriseSummary`, computed from each enterprise's already-fetched record count, to distinguish the two empty-vs-honest-zero cases above without a new query.
- **Two real build failures hit and fixed during this work**, both now resolved and confirmed via a passing `npm run build`:
  1. A leftover unused `usePathname` import in `Topbar.tsx` after the hamburger removal, tripping ESLint's `no-unused-vars` (which `next build` enforces by default).
  2. A Turbopack parser failure on a multi-line `Record<Enterprise, {...}>` generic type literal directly in a `.tsx` file — fixed by extracting a named `AddConfigEntry` interface and writing the `Record<...>` on one line.

### Sales → Financials linking (this update — build-verified, not live-verified)

Closes the gap flagged in this document's own prior "Remaining" list (previously item #3: "milk/meat/wool/egg sales are fully disconnected from Financials; double-entry required manually"). Crop sales were explicitly out of scope for this pass and remain manual-entry-only, unchanged.

- **Wool & meat (sheep)** — `lib/data/sheep.ts`'s `createWoolHarvestRecord`/`createMeatOffFlockRecord` now optionally accept a `saleValueAmount` + `recordedBy`, and when a positive sale value is given, also write a matching `financial_transactions` income row (`wool_sale` / `livestock_sale`) via the existing `createTransaction` from `lib/data/financials.ts`. `lib/actions/sheep.ts`'s `createSheepEventAction` now fetches `getCurrentUserId()` alongside role (previously role-only) to supply `recordedBy`, and revalidates `/financials`/`/financials/transactions` in addition to the sheep paths it already revalidated.
- **Milk & eggs (dairy/poultry)** — routed through the **existing** `stock_movements`/`sale_out` mechanism in `lib/data/inventory.ts`, rather than a new collection — matches how the farm actually sells (bulk to a cooperative/trader, not per-milking or per-log). `createStockMovement` now optionally accepts `saleValueAmount`; when the movement is `sale_out` against a `produce_output` item whose `linkedEnterprise` is `dairy` or `poultry`, it writes a matching `milk_sale`/`egg_sale` income transaction. A new `ENTERPRISE_SALE_CATEGORY` map keeps this deliberately narrow to just those two enterprises — crops/other produce sales are not silently extended. `components/inventory/MovementsView.tsx`'s form only shows the optional "Sale value (KES)" field when the selected item and movement type actually qualify, so nobody enters a price that goes nowhere.
- **Every added write follows the codebase's existing "two/three writes, one logical operation, not atomic" convention** already documented for `createHarvestRecord`/`upsertMilkLog`/`createStockMovement`'s own quantity update — a failure on the financial-transaction write doesn't roll back the underlying sale/harvest record, consistent with how every other multi-write operation in this codebase already behaves.

---

## Remaining

Renumbered and revised from the prior version of this document — items 1–4 below are unchanged from before this update (not touched by this session's work); the sales-linking item that used to be #3 is now closed and moved to Done above.

1. **`pb_hooks/alerts.pb.js`** — only `low_stock`/`expiring_stock` of the 7 `AlertType` values are wired. `health_followup_due`/`milk_withdrawal_active`/`breeding_check_due`/`harvest_window_open`/`task_overdue` remain unbuilt. `getActiveQuarantine()` already computes most of what `milk_withdrawal_active` needs.
2. **Autodate fields** — only `milk_logs` has them (migration 021). ~11 other collections' `createdAt`/`updatedAt` reads are still silently undefined.
3. **Sheep-side quarantine live-verification** — code-complete, build-verified, structurally identical to the twice-live-tested cattle/poultry pattern, but not yet independently confirmed against a real seeded record end-to-end (sandbox process-lifetime issue cut the original attempt short).
4. **Offline support beyond milk entry** — `lib/offline/` infrastructure exists and is proven for milk; egg logging and health/quarantine logging haven't been extended to use it yet.
5. **`kabatu-backup.sh` verification** — confirm it's still correctly backing up `pb_data` under the current Docker Compose deployment model, now with real farm data in production.
6. **MilkLog composition fields** (butterfat%/protein%/safety) — needed for Kenya's Quality-Based Milk Payment (QBP) rollout; time-sensitive given the active national policy shift.
7. **SMS delivery for health/breeding alerts** — via Africa's Talking, once alert type #1 above is further built out; field workers are on feature phones with unreliable data, so this is judged more impactful than in-app badges alone.
8. **HealthRecord cost field** — same financial-disconnection pattern as sales, but on the expense side; not addressed by this session's sales-linking work, which was income-only.
9. **`manifest.json` has no app icons.**
10. **This tracker's own claim discipline** — the two new "Done" sections above are explicitly build-verified only; a live smoke test (seed a produce item + sale movement, or a wool sale with a real sale value, against a real running PocketBase + Next.js instance) hasn't been performed and should be, before this is upgraded to the same confidence level as the cattle/poultry quarantine work.

## Process note for whoever picks this up next

An earlier handoff document in this project's history claimed migrations existed and a module was complete when neither was true in the actual code. Every "Done" claim above was checked against real command output in the session that made the change — with the explicit exception, stated plainly rather than glossed over, that this update's two new sections are build-verified only, not live-verified, because the environment that produced them had no access to a running PocketBase instance or browser. Keep the underlying discipline going regardless of environment: **never write "done" without having just run the verification and seen its output in that same sitting** — and when a weaker form of verification is all that's available, say so explicitly rather than letting it read the same as the stronger claim.
