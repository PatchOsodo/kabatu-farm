import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { ExpirationBatch, InventoryItem, StockMovement, StockMovementType, UserRole } from "@/types/farm";

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

function mapInventoryItem(record: Record<string, unknown>): InventoryItem {
  return {
    id: record.id as string,
    name: record.name as string,
    category: record.category as InventoryItem["category"],
    unit: record.unit as InventoryItem["unit"],
    currentQuantity: record.currentQuantity as number,
    reorderThreshold: record.reorderThreshold as number,
    unitCost: (record.unitCost as InventoryItem["unitCost"]) || undefined,
    supplier: (record.supplier as string) || undefined,
    storageLocation: (record.storageLocation as string) || undefined,
    linkedEnterprise: (record.linkedEnterprise as InventoryItem["linkedEnterprise"]) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapStockMovement(record: Record<string, unknown>): StockMovement {
  return {
    id: record.id as string,
    itemId: record.itemId as string,
    type: record.type as StockMovementType,
    quantity: record.quantity as number,
    date: toISODate(record.date as string) as string,
    relatedRecordId: (record.relatedRecordId as string) || undefined,
    performedBy: record.performedBy as string,
    notes: (record.notes as string) || undefined,
    createdAt: record.created as string,
  };
}

function mapExpirationBatch(record: Record<string, unknown>): ExpirationBatch {
  return {
    id: record.id as string,
    itemId: record.itemId as string,
    batchNumber: (record.batchNumber as string) || undefined,
    quantity: record.quantity as number,
    expirationDate: toISODate(record.expirationDate as string) as string,
    receivedDate: toISODate(record.receivedDate as string) as string,
  };
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const pb = await getServerPb();
  const records = await pb.collection("inventory_items").getFullList({ sort: "name" });
  return records.map(mapInventoryItem);
}

export async function getExpirationBatches(): Promise<ExpirationBatch[]> {
  const pb = await getServerPb();
  const records = await pb.collection("expiration_batches").getFullList({ sort: "expirationDate" });
  return records.map(mapExpirationBatch);
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const pb = await getServerPb();
  const records = await pb.collection("stock_movements").getFullList({ sort: "-date" });
  return records.map(mapStockMovement);
}

export type StockMovementInput = {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  date: string;
  notes?: string;
  performedBy: string;
};

const INFLOW_TYPES: StockMovementType[] = ["purchase_in", "production_in", "adjustment"];

/**
 * Creates the ledger entry AND updates the item's running `currentQuantity`
 * — same "two writes, one logical operation, not atomic" caveat as
 * createHarvestRecord (lib/data/crops.ts) and upsertMilkLog
 * (lib/data/dairy-records.ts). PocketBase's JS SDK has no cross-collection
 * transaction, so if the second write fails the ledger entry is left in
 * place for manual reconciliation rather than silently lost.
 *
 * `currentQuantity` reaching exactly 0 (the ordinary "ran out of stock"
 * case) used to fail here — PocketBase rejects `0` on `required: true`
 * number fields. Fixed in pb_migrations/015_inventory_zero_value_fix.js
 * (loosens `currentQuantity`/`reorderThreshold` to not-required) and
 * confirmed against a live instance after the fix.
 */
export async function createStockMovement(input: StockMovementInput): Promise<StockMovement> {
  const pb = await getServerPb();

  const record = await pb.collection("stock_movements").create(input);

  const item = await pb.collection("inventory_items").getOne(input.itemId);
  const delta = INFLOW_TYPES.includes(input.type) ? input.quantity : -input.quantity;
  const nextQuantity = Math.max(0, (item.currentQuantity as number) + delta);
  await pb.collection("inventory_items").update(input.itemId, { currentQuantity: nextQuantity });

  return mapStockMovement(record);
}

export type InventoryItemInput = Omit<InventoryItem, "id" | "createdAt" | "updatedAt">;

/**
 * The actual fix for "no fields to input" on Inventory: there was no way
 * anywhere in the app to create a base InventoryItem at all — only
 * createStockMovement() existed, which logs a change against an item
 * that already has to exist. On a fresh farm with zero items, the
 * movement form's item dropdown had nothing to select and nothing could
 * ever be added. This is that missing foundational create.
 */
export async function createInventoryItem(input: InventoryItemInput): Promise<InventoryItem> {
  const pb = await getServerPb();
  const record = await pb.collection("inventory_items").create(input);
  return mapInventoryItem(record);
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.id as string | undefined) : undefined;
}
