"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  upsertMilkLog,
  getCurrentUserId,
  getCurrentUserRole,
  createCalvingRecord,
  updateLactationCycle,
  type MilkLogInput,
  type CalvingRecordInput,
} from "@/lib/data/dairy-records";
import { canManageMilkLogs, canManageClinicalRecords } from "@/lib/authz";

/**
 * Called directly from MilkLogView's client-side commit handler, not via
 * a <form action={}>/useActionState — the milk log grid has many
 * independently-editable cells, not one form to submit. Server actions
 * can be invoked as plain async functions from a client component; this
 * is that case, not the CattleForm case.
 */
export async function upsertMilkLogAction(
  input: Omit<MilkLogInput, "recordedBy">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [role, userId] = await Promise.all([getCurrentUserRole(), getCurrentUserId()]);
  if (!canManageMilkLogs(role)) {
    return { ok: false, error: "You don't have permission to log milk yields." };
  }
  if (!userId) {
    return { ok: false, error: "Your session has expired — please log in again." };
  }
  if (!Number.isFinite(input.liters) || input.liters < 0) {
    return { ok: false, error: "Enter a valid, non-negative amount." };
  }

  try {
    await upsertMilkLog({ ...input, recordedBy: userId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this entry." };
  }

  revalidatePath("/dairy/milk-log");
  revalidatePath("/dairy");
  return { ok: true };
}

function parseCalvingForm(motherId: string, formData: FormData): CalvingRecordInput {
  const calfSex = formData.get("calfSex");
  const complications = formData.get("complications");
  const assistedBy = formData.get("assistedBy");
  return {
    motherId,
    calvingDate: String(formData.get("calvingDate")),
    outcome: formData.get("outcome") as CalvingRecordInput["outcome"],
    calfSex: calfSex ? (calfSex as CalvingRecordInput["calfSex"]) : undefined,
    complications: complications ? String(complications) : undefined,
    assistedBy: assistedBy ? String(assistedBy) : undefined,
  };
}

export async function createCalvingRecordAction(motherId: string, _prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManageClinicalRecords(role)) {
    return { error: "You don't have permission to log calving records." };
  }

  try {
    await createCalvingRecord(parseCalvingForm(motherId, formData));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this calving record." };
  }

  revalidatePath(`/dairy/${motherId}`);
  redirect(`/dairy/${motherId}`);
}

export async function updateLactationStageAction(
  lactationId: string,
  cattleId: string,
  _prevState: { ok: boolean; error?: string } | undefined,
  formData: FormData
) {
  const role = await getCurrentUserRole();
  if (!canManageClinicalRecords(role)) {
    return { ok: false, error: "You don't have permission to update lactation records." };
  }

  const stage = formData.get("stage") as "early" | "mid" | "late" | "dry" | null;
  if (!stage) {
    return { ok: false, error: "Choose a stage." };
  }

  try {
    // Dry-off is the one stage transition with a real side effect: it
    // closes the cycle out with an endDate, same as PocketBase itself
    // would expect for a finished lactation_cycles row. Other stage
    // changes (early/mid/late) are just the label moving forward.
    await updateLactationCycle(lactationId, {
      stage,
      endDate: stage === "dry" ? new Date().toISOString().slice(0, 10) : undefined,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not update lactation stage." };
  }

  revalidatePath(`/dairy/${cattleId}`);
  return { ok: true };
}
