"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createHarvestRecord,
  createInputApplication,
  getCurrentUserRole,
  createLandParcel,
  updateLandParcel,
  createCropCycle,
  type LandParcelInput,
  type CropCycleInput,
} from "@/lib/data/crops";
import { canManageCrops, canManageLandParcels } from "@/lib/authz";
import type { InputApplicationType } from "@/types/farm";

export type CropLogInput =
  | {
      kind: "input";
      cropCycleId: string;
      date: string;
      inputType: InputApplicationType;
      productName: string;
      quantity: number;
      unit: "kg" | "liters" | "grams" | "ml";
      inventoryItemId?: string;
    }
  | { kind: "harvest"; cropCycleId: string; date: string; quantity: number; qualityGrade?: string };

/**
 * One action for both entry types, mirroring CropsLogView's single
 * unified form. Unit now comes from the form — either auto-filled and
 * locked from the selected inventory item's own unit, or picked manually
 * when no item is linked — instead of being hardcoded to "kg" regardless
 * of what was actually applied (a liquid pesticide dosed in liters was
 * being mis-recorded as kg before this fix).
 */
export async function createCropLogEntryAction(
  input: CropLogInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getCurrentUserRole();
  if (!canManageCrops(role)) {
    return { ok: false, error: "You don't have permission to log crop activity." };
  }
  if (!input.cropCycleId || !input.date || !Number.isFinite(input.quantity) || input.quantity < 0) {
    return { ok: false, error: "Fill in crop cycle, date, and a valid non-negative quantity." };
  }

  try {
    if (input.kind === "input") {
      if (!input.productName.trim()) {
        return { ok: false, error: "Enter a product name." };
      }
      await createInputApplication({
        cropCycleId: input.cropCycleId,
        type: input.inputType,
        productName: input.productName.trim(),
        quantityUsed: input.quantity,
        unit: input.unit,
        applicationDate: input.date,
        inventoryItemId: input.inventoryItemId,
      });
    } else {
      await createHarvestRecord({
        cropCycleId: input.cropCycleId,
        harvestDate: input.date,
        quantityKg: input.quantity,
        qualityGrade: input.qualityGrade?.trim() || undefined,
      });
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this entry." };
  }

  revalidatePath("/crops/log");
  revalidatePath("/crops/cycles");
  revalidatePath("/crops");
  return { ok: true };
}

export async function createLandParcelAction(_prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManageLandParcels(role)) {
    return { error: "You don't have permission to add a plot." };
  }

  const soilPH = formData.get("soilPH");
  const soilType = formData.get("soilType");

  const input: LandParcelInput = {
    name: String(formData.get("name")),
    acreage: Number(formData.get("acreage")) || 0,
    currentUse: formData.get("currentUse") as LandParcelInput["currentUse"],
    soilType: soilType ? (soilType as LandParcelInput["soilType"]) : undefined,
    soilPH: soilPH ? Number(soilPH) : undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  let newId: string;
  try {
    const record = await createLandParcel(input);
    newId = record.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this plot." };
  }

  revalidatePath("/crops");
  redirect(`/crops/${newId}`);
}

export async function updateLandParcelAction(plotId: string, _prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManageLandParcels(role)) {
    return { error: "You don't have permission to edit this plot." };
  }

  const soilPH = formData.get("soilPH");
  const soilType = formData.get("soilType");

  try {
    await updateLandParcel(plotId, {
      name: String(formData.get("name")),
      acreage: Number(formData.get("acreage")) || 0,
      currentUse: formData.get("currentUse") as LandParcelInput["currentUse"],
      soilType: soilType ? (soilType as LandParcelInput["soilType"]) : undefined,
      soilPH: soilPH ? Number(soilPH) : undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this plot." };
  }

  revalidatePath(`/crops/${plotId}`);
  redirect(`/crops/${plotId}`);
}

export async function createCropCycleAction(
  input: Omit<CropCycleInput, "actualYieldToDateKg">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getCurrentUserRole();
  if (!canManageCrops(role)) {
    return { ok: false, error: "You don't have permission to add a planting." };
  }
  if (!input.plotId || !input.cropName.trim() || !Number.isFinite(input.areaPlantedAcres) || input.areaPlantedAcres <= 0) {
    return { ok: false, error: "Choose a plot, crop name, and a positive area planted." };
  }

  try {
    await createCropCycle({ ...input, actualYieldToDateKg: 0 });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this planting." };
  }

  revalidatePath("/crops/cycles");
  revalidatePath("/crops");
  revalidatePath("/crops/log");
  return { ok: true };
}
