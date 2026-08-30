import type { UserRole } from "@/types/farm";

/**
 * Mirrors the createRule/updateRule on the `cattle` collection
 * (pb_migrations/003_cattle_collection.js). Keep these two in sync —
 * this is purely a UI convenience (hide the "Add"/"Edit" button for
 * roles that can't use it) and is NOT itself an access control boundary.
 * PocketBase's own collection rules are the real enforcement; a user
 * could still hit the API directly and would correctly be rejected there
 * even if this check were ever wrong or bypassed.
 */
const CATTLE_MANAGER_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead"];

export function canManageCattle(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return CATTLE_MANAGER_ROLES.includes(role);
}

/**
 * Mirrors milk_logs' createRule/updateRule in pb_migrations/009_dairy_records.js
 * — deliberately includes `worker`, unlike CATTLE_MANAGER_ROLES, since
 * day-to-day milking entries are exactly what MilkLogView is for.
 */
const MILK_LOG_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead", "worker"];

export function canManageMilkLogs(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return MILK_LOG_ROLES.includes(role);
}

/**
 * Mirrors breeding_records/calving_records/lactation_cycles' CLINICAL_WRITE_ROLES
 * in pb_migrations/009_dairy_records.js — vet_agronomist instead of worker,
 * since this is clinical data, not routine logging.
 */
const CLINICAL_RECORD_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead", "vet_agronomist"];

export function canManageClinicalRecords(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return CLINICAL_RECORD_ROLES.includes(role);
}

/** Mirrors WRITE_ROLES in pb_migrations/011_sheep_collections.js. */
const SHEEP_WRITE_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead", "worker"];

export function canManageSheep(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return SHEEP_WRITE_ROLES.includes(role);
}

/** Mirrors WRITE_ROLES in pb_migrations/012_poultry_collections.js. */
const POULTRY_WRITE_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead", "worker"];

export function canManagePoultry(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return POULTRY_WRITE_ROLES.includes(role);
}

/** Mirrors WRITE_ROLES in pb_migrations/007_crop_collections.js. */
const CROPS_WRITE_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead"];

export function canManageCrops(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return CROPS_WRITE_ROLES.includes(role);
}

/**
 * land_parcels.createRule/updateRule is narrower than crop_cycles' —
 * owner/farm_manager only, NOT enterprise_lead (see
 * pb_migrations/002_land_parcels_collection.js vs 007's WRITE_ROLES).
 * Using canManageCrops to gate plot creation would show an
 * enterprise_lead user an "Add plot" button that then fails on submit —
 * this matches PocketBase's real rule instead.
 */
const LAND_PARCEL_WRITE_ROLES: UserRole[] = ["owner", "farm_manager"];

export function canManageLandParcels(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return LAND_PARCEL_WRITE_ROLES.includes(role);
}

/**
 * Mirrors WRITE_ROLES (not READ_ROLES) in pb_migrations/006_inventory_items.js
 * and 008_stock_expiration.js — accountant can view inventory (cost/valuation
 * oversight) but not write physical stock changes, per that migration's own comment.
 */
const INVENTORY_WRITE_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead"];

export function canManageInventory(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return INVENTORY_WRITE_ROLES.includes(role);
}

/**
 * Tasks has an asymmetric rule (see pb_migrations/013_financials_and_tasks.js):
 * createRule is narrower than updateRule — worker/vet_agronomist can
 * update status on tasks assigned to them but cannot create new ones.
 * Two functions, not one, to keep that distinction visible at call sites.
 */
const TASKS_CREATE_ROLES: UserRole[] = ["owner", "farm_manager", "enterprise_lead"];
const TASKS_UPDATE_ROLES: UserRole[] = [
  "owner",
  "farm_manager",
  "enterprise_lead",
  "worker",
  "vet_agronomist",
];

export function canCreateTask(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return TASKS_CREATE_ROLES.includes(role);
}

export function canUpdateTaskStatus(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return TASKS_UPDATE_ROLES.includes(role);
}

/** Mirrors financial_transactions' single role list in pb_migrations/013_financials_and_tasks.js (same roles for read and write, unlike inventory/tasks). */
const FINANCIALS_ROLES: UserRole[] = ["owner", "farm_manager", "accountant"];

export function canManageFinancials(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return FINANCIALS_ROLES.includes(role);
}

/**
 * Module-level READ access, enforced in proxy.ts (route gating) and used
 * again in Sidebar.tsx (nav filtering) so the two stay in agreement — a
 * link that's hidden but still reachable, or reachable but not linked,
 * are both confusing. "dashboard" isn't listed here: "/" is public to
 * everyone unconditionally (see PUBLIC_EXACT_PATHS in proxy.ts) and isn't
 * gated by role at all.
 */
export type ModuleKey = "dairy" | "sheep" | "poultry" | "crops" | "inventory" | "tasks" | "financials";

// Enterprise operational overviews — read-only for guests, matching the
// PocketBase listRule/viewRule change in
// pb_migrations/004_cattle_public_read.js (dairy is the only one of these
// backed by a real collection so far; sheep/poultry/crops are still mock
// data, so guest-readability there has no data-layer dependency to match).
const GUEST_READABLE_MODULES: ModuleKey[] = ["dairy", "sheep", "poultry", "crops"];

// Sensitive modules: authenticated AND role-restricted. These role lists
// are a first pass based on who plausibly needs each module day-to-day —
// adjust freely, they're just a plain array to edit, not load-bearing
// logic anywhere else.
const MODULE_ROLE_REQUIREMENTS: Partial<Record<ModuleKey, UserRole[]>> = {
  inventory: ["owner", "farm_manager", "enterprise_lead", "accountant"],
  tasks: ["owner", "farm_manager", "enterprise_lead", "worker", "vet_agronomist"],
  financials: ["owner", "farm_manager", "accountant"],
};

export function isGuestReadableModule(moduleKey: ModuleKey): boolean {
  return GUEST_READABLE_MODULES.includes(moduleKey);
}

/**
 * True if `role` may READ this module. A guest (role undefined/null) can
 * access guest-readable modules only; everything else requires a role
 * present in that module's MODULE_ROLE_REQUIREMENTS list (or, for any
 * module not listed there, simply being authenticated at all).
 */
export function canAccessModule(role: UserRole | undefined | null, moduleKey: ModuleKey): boolean {
  if (isGuestReadableModule(moduleKey)) return true;
  if (!role) return false; // not logged in, and this module isn't guest-readable

  const allowedRoles = MODULE_ROLE_REQUIREMENTS[moduleKey];
  if (!allowedRoles) return true; // listed module, no specific role restriction beyond auth
  return allowedRoles.includes(role);
}
