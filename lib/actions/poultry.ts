"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  upsertEggLog,
  getCurrentUserId,
  getCurrentUserRole,
  updatePoultryFlockPhoto,
  createPoultryFlock,
  updatePoultryFlock,
  type EggLogInput,
  type PoultryFlockInput,
} from "@/lib/data/poultry";
import { canManagePoultry } from "@/lib/authz";

/**
 * Called directly from EggLogView's client-side commit handler, not via
 * a <form>/useActionState — same reasoning as upsertMilkLogAction in
 * lib/actions/dairy-records.ts: a spreadsheet grid with independently
 * editable cells, not one form submit.
 */
export async function upsertEggLogAction(
  input: Omit<EggLogInput, "recordedBy">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [role, userId] = await Promise.all([getCurrentUserRole(), getCurrentUserId()]);
  if (!canManagePoultry(role)) {
    return { ok: false, error: "You don't have permission to log egg collection." };
  }
  if (!userId) {
    return { ok: false, error: "Your session has expired — please log in again." };
  }
  if (!Number.isFinite(input.eggsCollected) || input.eggsCollected < 0) {
    return { ok: false, error: "Enter a valid, non-negative number collected." };
  }
  if (!Number.isFinite(input.eggsBroken) || input.eggsBroken < 0) {
    return { ok: false, error: "Enter a valid, non-negative number broken." };
  }

  try {
    await upsertEggLog({ ...input, recordedBy: userId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this entry." };
  }

  revalidatePath("/poultry/egg-log");
  revalidatePath("/poultry");
  return { ok: true };
}

export async function updatePoultryFlockPhotoAction(
  flockId: string,
  _prevState: { ok: boolean; error?: string } | undefined,
  formData: FormData
) {
  const role = await getCurrentUserRole();
  if (!canManagePoultry(role)) {
    return { ok: false, error: "You don't have permission to update this flock's photo." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a photo to upload." };
  }

  try {
    await updatePoultryFlockPhoto(flockId, file);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not upload photo." };
  }

  revalidatePath(`/poultry/${flockId}`);
  return { ok: true };
}

export async function createPoultryFlockAction(_prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManagePoultry(role)) {
    return { error: "You don't have permission to add a flock." };
  }

  const ageWeeks = formData.get("ageWeeksAtAcquisition");

  const input: PoultryFlockInput = {
    flockName: String(formData.get("flockName")),
    type: formData.get("type") as PoultryFlockInput["type"],
    breed: String(formData.get("breed")),
    housingLocation: String(formData.get("housingLocation")),
    currentBirdCount: Number(formData.get("currentBirdCount")) || 0,
    dateAcquired: String(formData.get("dateAcquired")),
    sourceType: formData.get("sourceType") as PoultryFlockInput["sourceType"],
    ageWeeksAtAcquisition: ageWeeks ? Number(ageWeeks) : undefined,
    status: formData.get("status") as PoultryFlockInput["status"],
  };

  let newId: string;
  try {
    const record = await createPoultryFlock(input);
    newId = record.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this flock." };
  }

  revalidatePath("/poultry");
  redirect(`/poultry/${newId}`);
}

export async function updatePoultryFlockAction(flockId: string, _prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManagePoultry(role)) {
    return { error: "You don't have permission to edit this flock." };
  }

  const ageWeeks = formData.get("ageWeeksAtAcquisition");

  try {
    await updatePoultryFlock(flockId, {
      flockName: String(formData.get("flockName")),
      type: formData.get("type") as PoultryFlockInput["type"],
      breed: String(formData.get("breed")),
      housingLocation: String(formData.get("housingLocation")),
      currentBirdCount: Number(formData.get("currentBirdCount")) || 0,
      dateAcquired: String(formData.get("dateAcquired")),
      sourceType: formData.get("sourceType") as PoultryFlockInput["sourceType"],
      ageWeeksAtAcquisition: ageWeeks ? Number(ageWeeks) : undefined,
      status: formData.get("status") as PoultryFlockInput["status"],
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this flock." };
  }

  revalidatePath(`/poultry/${flockId}`);
  redirect(`/poultry/${flockId}`);
}
