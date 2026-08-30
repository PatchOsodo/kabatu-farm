"use server";

import { revalidatePath } from "next/cache";
import {
  createTransaction,
  getCurrentUserId,
  getCurrentUserRole,
  type TransactionInput,
} from "@/lib/data/financials";
import { canManageFinancials } from "@/lib/authz";

export type TransactionFormInput = Omit<TransactionInput, "recordedBy">;

export async function createTransactionAction(
  input: TransactionFormInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [role, userId] = await Promise.all([getCurrentUserRole(), getCurrentUserId()]);
  if (!canManageFinancials(role)) {
    return { ok: false, error: "You don't have permission to log transactions." };
  }
  if (!userId) {
    return { ok: false, error: "Your session has expired — please log in again." };
  }
  if (!Number.isFinite(input.amountValue) || input.amountValue <= 0 || !input.description.trim()) {
    return { ok: false, error: "Enter a valid amount and a description." };
  }

  try {
    await createTransaction({ ...input, description: input.description.trim(), recordedBy: userId });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this transaction." };
  }

  revalidatePath("/financials/transactions");
  revalidatePath("/financials");
  return { ok: true };
}
