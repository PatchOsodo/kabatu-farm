# Kabatu Farm — Tracker

Every claim below was checked against real command output in the sessions that made these changes — `tsc --noEmit`, `npm run build`, and a live PocketBase v0.23.4 instance seeded via its REST API — not assumed or written from memory of what should be true. Where something was found to be inaccurate in an earlier version of this document, it's noted rather than silently corrected, so the same mistake doesn't get repeated.

---

## Done

### All 7 modules — data layer wired to real PocketBase, mock data replaced

| Module | Collections | Status |
|---|---|---|
| Cattle | `cattle`, `land_parcels` | Wired, verified, guest-readable |
| Dairy supporting records | `milk_logs`, `breeding_records`, `calving_records`, `lactation_cycles` | Wired, verified, mock deleted |
| Sheep | `sheep_flocks`, `lambing_records`, `wool_harvest_records`, `meat_off_flock_records` | Wired, verified, mock deleted |
| Poultry | `poultry_flocks`, `egg_collection_logs`, `poultry_mortality_logs` | Wired, verified, mock deleted (except `MOCK_FEED_LOGS` — see Health/Feed below) |
| Crops | `crop_cycles`, `input_applications`, `harvest_records` | Wired, verified, mock deleted, unit auto-fill built |
| Inventory | `inventory_items`, `stock_movements`, `expiration_batches` | Wired, verified, mock deleted |
| Tasks | `tasks` | Wired, verified, mock deleted |
| Financials | `financial_transactions` | Wired, verified, mock deleted |

`lib/mock/` contains exactly one file: `poultry.ts`, and only its `MOCK_FEED_LOGS` export is actually imported anywhere (confirmed via grep across `app/` and `components/`) — intentional, see Health/Feed section below.

### Auth & access control

Guest view access on `dairy`, `sheep`, `poultry`, `crops`; login required + role-gated on `inventory`, `tasks`, `financials`; role-based route filtering in `Sidebar`/`Topbar` nav. Username-or-email login. All in `lib/authz.ts` / `proxy.ts` / `lib/session.ts` — complete, working, don't rebuild.

### Migrations — all 18 apply cleanly from a fresh database, verified as a full chain

```
001_users_role_fields.js            010_health_feed.js
002_land_parcels_collection.js      011_sheep_collections.js
003_cattle_collection.js            012_poultry_collections.js
004_cattle_public_read.js           013_financials_and_tasks.js
005_users_username_field.js         014_alerts.js
006_inventory_items.js              015_inventory_zero_value_fix.js
007_crop_collections.js             016_land_parcels_public_read.js
008_stock_expiration.js             017_crop_cycles_zero_value_fix.js
009_dairy_records.js                018_quarantine_fields_and_feed_access.js
```

### Bugs found and fixed (all confirmed against a live instance, not just reasoned about)

1. **Date-equality comparisons silently broken everywhere** — PocketBase stores `date` fields as full timestamps, not the plain `YYYY-MM-DD` the `ISODate` type promises. Fixed once at the data-layer boundary (every `get*` function normalizes dates).
2. **Wool-harvest quick-entry form had no field for `sheepShorn`** (a required count) — added the missing input rather than defaulting it to `0`.
3. **PocketBase rejects `0` on `required: true` number fields** — a real, product-breaking bug: setting `inventory_items.currentQuantity` to exactly `0` (ordinary "ran out of stock") failed validation. Fixed via `015_inventory_zero_value_fix.js`. The same bug also affected `crop_cycles.actualYieldToDateKg`, fixed via `017` — scoped to just that field, not a blanket loosening (`areaPlantedAcres` has no legitimate zero case the way "0 kg harvested so far" does).
4. **`land_parcels` wasn't guest-readable despite belonging to the guest-readable "crops" module** — fixed via `016_land_parcels_public_read.js`.
5. **`feed_consumption_logs` write access too narrow for how the module is actually used** — day-to-day feed logging needs to be frictionless for field workers, same as `milk_logs` already treats `worker`. Broadened via `018`. A proposed version of this fix used role names (`vet`, `admin`) that don't exist in this system (real values: `owner | farm_manager | enterprise_lead | worker | vet_agronomist | accountant`) and tried to recreate two collections that already existed — corrected before applying.
6. **Crops log form always recorded input applications in `kg`** regardless of what was actually applied — a liquid pesticide dosed in liters was being mis-recorded. Fixed: the form now links an inventory item and auto-fills/locks the unit from that item's own `unit` field (with a `g`→`grams` mapping, since `InventoryItem.unit` and `InputApplication.unit` are different enums), falling back to manual selection when no item is linked.
7. **6 of 7 `lib/mock/*.ts` files were still on disk** despite being fully unwired — a cleanup step that got skipped, not a wiring gap (confirmed nothing imported them). Deleted.

### Phase 2.1 (Quarantine) — schema landed

`health_records` extended additively (`018`) with `withdrawalDaysMilk`, `withdrawalDaysMeat`, `quarantineUntilDate`, per the original Master Handoff's spec — `quarantineUntilDate` is the single source of truth for "is this animal quarantined right now" (computed as `> now`), not a separate status field that could drift out of sync with it. Verified with a real saved record.

---

## Done — Quarantine UI (Phase 2.1)

`lib/quarantine.ts` — `getActiveQuarantine()` split into its own client-safe pure function (no `next/headers`), after a real build failure caught it being imported into `MilkLogView` (a client component) via `lib/data/health.ts`, which would have pulled server-only code into the browser bundle. Worth remembering as a pattern: any helper a client component needs must live outside files that import `next/headers` or a PocketBase server client, even if the helper itself is pure.

- **Cattle** (dairy) — badge on list page, detail page, and the milk-log grid; quarantined cows' milk stays logged (the animal doesn't stop producing) but is excluded from the session/grand "sellable" totals, with a visible `(sellable only)` note when any cow is quarantined. **Fully live-tested**: seeded a real quarantined cow via the PocketBase API, built and ran the actual standalone server (the real Docker entrypoint), logged in for real, confirmed the badge on all three surfaces and confirmed the milk total math actually excludes the quarantined cow's liters — not just that the code compiles.
- **Sheep** — badge on flock list and detail page, using flock-level quarantine (`HealthRecord.animalId = flock.id`), consistent with how sheep are modeled everywhere else in this app (lambing, wool, meat sales are all per-flock, not per-ewe — this isn't a workaround for lacking individual tracking, it's the right granularity). Additionally: **meat sale creation is actively blocked** for a quarantined flock (`lib/actions/sheep.ts`) — a real write-time guard, not just a display exclusion, since sheep have no running sales total in the UI to exclude a figure from the way milk logs do.
- **Verification depth differs between the two, worth being honest about**: cattle got the full live seeded-record test described above. Sheep got a clean `tsc` and `npm run build`, but the live end-to-end test was cut short by this sandbox's process-lifetime limits (PocketBase kept dying between separate tool calls — an environment issue hit repeatedly this session, unrelated to the code). Confidence in the sheep path is high — it's the identical `getActiveQuarantine` function and `QuarantineBadge` component already proven correct on the cattle side, wired through the same page-level pattern used successfully everywhere else — but "identical code, not independently observed" is a different claim than "observed working," and this document should say which one is true for each.

## Done — Poultry quarantine

Same flock-level pattern as sheep — badge on list page and detail page, plus egg-log totals excluding quarantined flocks (mirroring milk-log's "sellable only" treatment exactly: `EggLogView.tsx` gained the same `quarantineByFlockId` computation as `MilkLogView.tsx`, eggs still get logged since birds still lay, just excluded from the sellable total). **Fully live-tested this time**: seeded a real quarantined layers flock with a real egg log via the PocketBase API, built and ran the actual standalone server, logged in for real, and confirmed the badge on both the list and detail pages plus the "sellable only" exclusion on the egg-log page — all three observed working, not inferred from code review. This closes the sheep-side verification gap in method (not the same flock, but the same *kind* of proof), since the poultry pass didn't hit the sandbox process-lifetime issue that cut the sheep test short.

`lib/quarantine.ts`'s client/server split (from the sheep/cattle pass) was applied correctly from the start this time — `EggLogView.tsx` imports `getActiveQuarantine` directly from `lib/quarantine`, not through `lib/data/health.ts`, so the build never hit the same bundling error twice.

## Remaining

1. **`health_records`/`feed_consumption_logs` still have no dedicated route or `ModuleKey`** — by design: health data now lives inside the dairy/sheep/poultry views it's attached to, rather than getting its own page.
2. **`pb_hooks/alerts.pb.js`** — the alerts engine. `alerts` collection exists (writes locked to `null` — system/hook-only per `014_alerts.js`), but nothing populates it yet. This is a genuinely different mechanism (PocketBase's JS hook runtime, not migrations) that nothing in this codebase has used. Needs its own real-hook-firing verification once built, not just a syntax check.
3. **Attachments/photos** — `InventoryItem`, `Cattle.photoUrl`, and a few other fields exist in `types/farm.ts` but no upload UI exists anywhere yet.
4. **Sheep-side live verification** — still worth an independent confirmation pass once the sandbox/environment issue isn't in the way. Code is compile-verified and structurally identical to the now-twice-proven pattern (cattle and poultry both fully live-tested), but that's still not the same as having observed the sheep case directly.

## Process note for whoever picks this up next

An earlier handoff document in this project's history claimed migrations existed and a module was complete when neither was true in the actual code. Every "Done" claim above was checked against real command output in the session that made the change. Keep that going: **never write "done" without having just run the verification and seen its output in that same sitting.**
