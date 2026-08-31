"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createLambingRecord,
  createMeatOffFlockRecord,
  createWoolHarvestRecord,
  getCurrentUserRole,
  getCurrentUserId,
  updateSheepFlockPhoto,
  createSheepFlock,
  updateSheepFlock,
  type SheepFlockInput,
} from "@/lib/data/sheep";
import { canManageSheep } from "@/lib/authz";
import { getHealthRecords } from "@/lib/data/health";
import { getActiveQuarantine } from "@/lib/quarantine";

export type SheepEventInput =
| { kind: "lambing"; flockId: string; date: string; lambsBornAlive: number; lambsStillborn: number }
| {
  kind: "wool";
  flockId: string;
  date: string;
  sheepShorn: number;
  totalWeightKg: number;
  saleValueAmount?: number;
}
| { kind: "meat"; flockId: string; date: string; animalsSold: number; saleValueAmount?: number };

/**
 * One action for all three record types, mirroring SheepEventsView's
 * single unified form (kind selects which collection it becomes) rather
 * than three separate actions for what the UI treats as one workflow.
 *
 * Now also fetches the current user id (previously only role was
 * fetched) — wool/meat sales need it to attribute the linked
 * financial_transactions row created inside createWoolHarvestRecord/
 * createMeatOffFlockRecord (see lib/data/sheep.ts). Lambing records
 * don't need it; still fetched up front for all three kinds since the
 * session check should happen before any branch-specific validation.
 */
export async function createSheepEventAction(
  input: SheepEventInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [role, userId] = await Promise.all([getCurrentUserRole(), getCurrentUserId()]);
  if (!canManageSheep(role)) {
    return { ok: false, error: "You don't have permission to log sheep events." };
  }
  if (!userId) {
    return { ok: false, error: "Your session has expired — please log in again." };
  }
  if (!input.flockId || !input.date) {
    return { ok: false, error: "Fill in flock and date." };
  }

  try {
    if (input.kind === "lambing") {
      if (!Number.isFinite(input.lambsBornAlive) || input.lambsBornAlive < 0) {
        return { ok: false, error: "Enter a valid number of lambs born alive." };
      }
      await createLambingRecord({
        flockId: input.flockId,
        lambingDate: input.date,
        lambsBornAlive: input.lambsBornAlive,
        lambsStillborn: input.lambsStillborn ?? 0,
      });
    } else if (input.kind === "wool") {
      if (!Number.isFinite(input.sheepShorn) || input.sheepShorn <= 0) {
        return { ok: false, error: "Enter how many sheep were shorn." };
      }
      if (!Number.isFinite(input.totalWeightKg) || input.totalWeightKg < 0) {
        return { ok: false, error: "Enter a valid total weight." };
      }
      await createWoolHarvestRecord({
        flockId: input.flockId,
        shearingDate: input.date,
        sheepShorn: input.sheepShorn,
        totalWeightKg: input.totalWeightKg,
        saleValueAmount: input.saleValueAmount,
        recordedBy: userId,
      });
    } else {
      if (!Number.isFinite(input.animalsSold) || input.animalsSold <= 0) {
        return { ok: false, error: "Enter how many animals were sold." };
      }
      // Real commercial guard, not just a display flag — if this flock
      // has an active withdrawal/quarantine, meat from it can't legally
      // be sold, so the sale can't be recorded at all rather than
      // recorded-but-visually-excluded-from-a-total (there's no running
      // meat-sale total in the UI to exclude it from, unlike milk logs —
      // blocking the write itself is the correct equivalent here).
      const healthRecords = await getHealthRecords();
      const activeQuarantine = getActiveQuarantine(healthRecords, input.flockId);
      if (activeQuarantine) {
        return {
          ok: false,
          error: `This flock is quarantined until ${activeQuarantine.quarantineUntilDate} — meat cannot be sold from it yet.`,
        };
      }
      await createMeatOffFlockRecord({
        flockId: input.flockId,
        date: input.date,
        animalsSold: input.animalsSold,
        saleValueAmount: input.saleValueAmount,
        recordedBy: userId,
      });
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this event." };
  }

  revalidatePath("/sheep/events");
  revalidatePath("/sheep");
  // A wool/meat entry with a sale value now writes a financial_transactions
  // row too — revalidate Financials so it doesn't show stale figures
  // until the next unrelated navigation happens to refresh it.
  revalidatePath("/financials");
  revalidatePath("/financials/transactions");
  return { ok: true };
}

export async function updateSheepFlockPhotoAction(
  flockId: string,
  _prevState: { ok: boolean; error?: string } | undefined,
  formData: FormData
) {
  const role = await getCurrentUserRole();
  if (!canManageSheep(role)) {
    return { ok: false, error: "You don't have permission to update this flock's photo." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a photo to upload." };
  }

  try {
    await updateSheepFlockPhoto(flockId, file);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not upload photo." };
  }

  revalidatePath(`/sheep/${flockId}`);
  return { ok: true };
}

export async function createSheepFlockAction(_prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManageSheep(role)) {
    return { error: "You don't have permission to add a flock." };
  }

  const ramCount = Number(formData.get("ramCount")) || 0;
  const eweCount = Number(formData.get("eweCount")) || 0;
  const lambCount = Number(formData.get("lambCount")) || 0;

  const input: SheepFlockInput = {
    flockName: String(formData.get("flockName")),
    breed: String(formData.get("breed")),
    purpose: formData.get("purpose") as SheepFlockInput["purpose"],
    ramCount,
    eweCount,
    lambCount,
    currentCount: ramCount + eweCount + lambCount,
    notes: (formData.get("notes") as string) || undefined,
  };

  let newId: string;
  try {
    const record = await createSheepFlock(input);
    newId = record.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this flock." };
  }

  revalidatePath("/sheep");
  redirect(`/sheep/${newId}`);
}

export async function updateSheepFlockAction(flockId: string, _prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManageSheep(role)) {
    return { error: "You don't have permission to edit this flock." };
  }

  const ramCount = Number(formData.get("ramCount")) || 0;
  const eweCount = Number(formData.get("eweCount")) || 0;
  const lambCount = Number(formData.get("lambCount")) || 0;

  try {
    await updateSheepFlock(flockId, {
      flockName: String(formData.get("flockName")),
                           breed: String(formData.get("breed")),
                           purpose: formData.get("purpose") as SheepFlockInput["purpose"],
                           ramCount,
                           eweCount,
                           lambCount,
                           currentCount: ramCount + eweCount + lambCount,
                           notes: (formData.get("notes") as string) || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this flock." };
  }

  revalidatePath(`/sheep/${flockId}`);
  redirect(`/sheep/${flockId}`);
}
