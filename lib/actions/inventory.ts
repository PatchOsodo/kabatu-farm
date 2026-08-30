"use server";

import { revalidatePath } from "next/cache";
import {
  createStockMovement,
  createInventoryItem,
  getCurrentUserId,
  getCurrentUserRole,
  type StockMovementInput,
  type InventoryItemInput,
} from "@/lib/data/inventory";
import { canManageInventory } from "@/lib/authz";
import type { StockMovementType } from "@/types/farm";

export type StockMovementFormInput = Omit<StockMovementInput, "performedBy">;

export async function createStockMovementAction(
  input: StockMovementFormInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [role, userId] = await Promise.all([getCurrentUserRole(), getCurrentUserId()]);
  if (!canManageInventory(role)) {
    return { ok: false, error: "You don't have permission to log stock movements." };
  }
  if (!userId) {
    return { ok: false, error: "Your session has expired — please log in again." };
  }
  if (!input.itemId || !input.type || !Number.isFinite(input.quantity) || input.quantity <= 0 || !input.date) {
    return { ok: false, error: "Fill in item, type, a positive quantity, and a date." };
  }

  try {
    await createStockMovement({ ...input, performedBy: userId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this movement." };
  }

  revalidatePath("/inventory/movements");
  revalidatePath("/inventory");
  return { ok: true };
}

// Re-exported so the type is available without a second import from lib/data.
export type { StockMovementType };

export async function createInventoryItemAction(
  input: InventoryItemInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getCurrentUserRole();
  if (!canManageInventory(role)) {
    return { ok: false, error: "You don't have permission to add inventory items." };
  }
  if (!input.name.trim() || !input.category || !input.unit) {
    return { ok: false, error: "Fill in a name, category, and unit." };
  }

  try {
    await createInventoryItem(input);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this item." };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  return { ok: true };
}
