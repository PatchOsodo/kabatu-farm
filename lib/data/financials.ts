import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { Enterprise, ExpenseCategory, FinancialTransaction, IncomeCategory, TransactionType, UserRole } from "@/types/farm";

/** Server-side helper — builds a PocketBase client hydrated from the request's auth cookie. */
async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

// See lib/data/dairy-records.ts's toISODate — PocketBase's full-timestamp
// date storage vs. the plain YYYY-MM-DD the ISODate type promises.
function toISODate(value: string | undefined | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function mapTransaction(record: Record<string, unknown>): FinancialTransaction {
  return {
    id: record.id as string,
    type: record.type as TransactionType,
    enterprise: record.enterprise as Enterprise,
    category: record.category as ExpenseCategory | IncomeCategory,
    amount: record.amount as FinancialTransaction["amount"],
    date: toISODate(record.date as string) as string,
    description: record.description as string,
    relatedRecordId: (record.relatedRecordId as string) || undefined,
    attachments: (record.attachments as FinancialTransaction["attachments"]) || undefined,
    recordedBy: record.recordedBy as string,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

export async function getTransactions(): Promise<FinancialTransaction[]> {
  const pb = await getServerPb();
  const records = await pb.collection("financial_transactions").getFullList({ sort: "-date" });
  return records.map(mapTransaction);
}

export type TransactionInput = {
  type: TransactionType;
  enterprise: Enterprise;
  category: ExpenseCategory | IncomeCategory;
  amountValue: number;
  date: string;
  description: string;
  recordedBy: string;
};

export async function createTransaction(input: TransactionInput): Promise<FinancialTransaction> {
  const pb = await getServerPb();
  const { amountValue, ...rest } = input;
  const record = await pb.collection("financial_transactions").create({
    ...rest,
    amount: { amount: amountValue, currency: "KES" },
  });
  return mapTransaction(record);
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.id as string | undefined) : undefined;
}
