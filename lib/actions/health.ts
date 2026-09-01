"use server";

import { revalidatePath } from "next/cache";
import { createHealthRecord, getCurrentUserRole, getCurrentUserId, type HealthRecordInput } from "@/lib/data/health";
import { canManageClinicalRecords } from "@/lib/authz";
import type { Enterprise, HealthRecord } from "@/types/farm";

// Where to revalidate after a successful save, keyed by animalType — the
// detail page a person was on (cattle/sheep/poultry) plus its module
// list page, plus Financials whenever a cost was entered (can't know in
// advance whether it was, so always included, same as the sales-linking
// actions already do).
const REVALIDATE_PATHS: Record<HealthRecord["animalType"], (animalId: string) => string[]> = {
  cattle: (id) => [`/dairy/${id}`, "/dairy"],
  sheep: (id) => [`/sheep/${id}`, "/sheep"],
  poultry_flock: (id) => [`/poultry/${id}`, "/poultry"],
};

export type HealthRecordFormInput = Omit<HealthRecordInput, "recordedBy">;

/**
 * Reuses canManageClinicalRecords — the same permission gate already
 * used for breeding/calving records (lib/actions/dairy-records.ts) and
 * matching health_records' own WRITE_ROLES in
 * pb_migrations/010_health_feed.js (owner/farm_manager/enterprise_lead/
 * vet_agronomist), rather than inventing a new check.
 */
export async function createHealthRecordAction(
  input: HealthRecordFormInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [role, userId] = await Promise.all([getCurrentUserRole(), getCurrentUserId()]);
  if (!canManageClinicalRecords(role)) {
    return { ok: false, error: "You don't have permission to log health records." };
  }
  if (!userId) {
    return { ok: false, error: "Your session has expired — please log in again." };
  }
  if (!input.animalId || !input.date) {
    return { ok: false, error: "Fill in the animal and date." };
  }
  if (input.costAmount !== undefined && (!Number.isFinite(input.costAmount) || input.costAmount < 0)) {
    return { ok: false, error: "Enter a valid, non-negative cost, or leave it blank." };
  }

  try {
    await createHealthRecord({ ...input, recordedBy: userId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this health record." };
  }

  for (const path of REVALIDATE_PATHS[input.animalType](input.animalId)) {
    revalidatePath(path);
  }
  if (input.costAmount !== undefined && input.costAmount > 0) {
    revalidatePath("/financials");
    revalidatePath("/financials/transactions");
  }
  return { ok: true };
}

// Re-exported for convenience at call sites that only need the enterprise
// mapping without importing from lib/data directly.
export type { Enterprise };
