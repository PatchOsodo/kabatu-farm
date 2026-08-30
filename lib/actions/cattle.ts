"use server";

import { redirect } from "next/navigation";
import { createCattle, updateCattle, getCurrentUserRole, type CattleInput } from "@/lib/data/cattle";
import { canManageCattle } from "@/lib/authz";
import type { Cattle } from "@/types/farm";

function parseCattleForm(formData: FormData): CattleInput {
  const optional = (key: string) => {
    const v = formData.get(key);
    return v && String(v).trim() !== "" ? String(v) : undefined;
  };

  return {
    tagId: String(formData.get("tagId") ?? "").trim(),
    name: optional("name"),
    category: formData.get("category") as Cattle["category"],
    breed: String(formData.get("breed") ?? "").trim(),
    sex: formData.get("sex") as Cattle["sex"],
    dob: optional("dob"),
    status: formData.get("status") as Cattle["status"],
    breedingStatus: formData.get("breedingStatus") as Cattle["breedingStatus"],
    acquisitionType: formData.get("acquisitionType") as Cattle["acquisitionType"],
    acquisitionDate: String(formData.get("acquisitionDate") ?? ""),
    notes: optional("notes"),
  };
}

function extractPhotoFile(formData: FormData): File | undefined {
  const value = formData.get("photoUrl");
  return value instanceof File && value.size > 0 ? value : undefined;
}

export async function createCattleAction(_prevState: unknown, formData: FormData) {
  // Defense-in-depth only — PocketBase's own createRule (see
  // pb_migrations/003_cattle_collection.js) is the real enforcement and
  // will reject this independently of this check.
  const role = await getCurrentUserRole();
  if (!canManageCattle(role)) {
    return { error: "You don't have permission to add cattle." };
  }

  let newId: string;
  try {
    const record = await createCattle(parseCattleForm(formData), extractPhotoFile(formData));
    newId = record.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this record." };
  }
  // redirect() throws internally — must be outside the try/catch above,
  // or it gets caught and reported as a save failure instead of navigating.
  redirect(`/dairy/${newId}`);
}

export async function updateCattleAction(id: string, _prevState: unknown, formData: FormData) {
  const role = await getCurrentUserRole();
  if (!canManageCattle(role)) {
    return { error: "You don't have permission to edit cattle." };
  }

  try {
    await updateCattle(id, parseCattleForm(formData), extractPhotoFile(formData));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save this record." };
  }
  redirect(`/dairy/${id}`);
}
