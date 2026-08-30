import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type {
  CropCycle,
  HarvestRecord,
  InputApplication,
  InputApplicationType,
  LandParcel,
  UserRole,
} from "@/types/farm";

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

function mapLandParcel(record: Record<string, unknown>): LandParcel {
  return {
    id: record.id as string,
    name: record.name as string,
    acreage: record.acreage as number,
    soilType: (record.soilType as LandParcel["soilType"]) || undefined,
    lastSoilTestDate: toISODate(record.lastSoilTestDate as string),
    soilPH: (record.soilPH as number) || undefined,
    currentUse: record.currentUse as LandParcel["currentUse"],
    gpsBoundary: (record.gpsBoundary as LandParcel["gpsBoundary"]) || undefined,
    notes: (record.notes as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapCropCycle(record: Record<string, unknown>): CropCycle {
  return {
    id: record.id as string,
    plotId: record.plotId as string,
    cropName: record.cropName as string,
    variety: (record.variety as string) || undefined,
    lifeCycle: record.lifeCycle as CropCycle["lifeCycle"],
    status: record.status as CropCycle["status"],
    seasonLabel: (record.seasonLabel as string) || undefined,
    plantingDate: toISODate(record.plantingDate as string),
    expectedHarvestDate: toISODate(record.expectedHarvestDate as string),
    areaPlantedAcres: record.areaPlantedAcres as number,
    seedSourceItemId: (record.seedSourceItemId as string) || undefined,
    seedQuantityUsed: (record.seedQuantityUsed as number) || undefined,
    forecastYieldKg: (record.forecastYieldKg as number) || undefined,
    actualYieldToDateKg: record.actualYieldToDateKg as number,
    notes: (record.notes as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapInputApplication(record: Record<string, unknown>): InputApplication {
  return {
    id: record.id as string,
    cropCycleId: record.cropCycleId as string,
    type: record.type as InputApplicationType,
    inventoryItemId: (record.inventoryItemId as string) || undefined,
    productName: record.productName as string,
    quantityUsed: record.quantityUsed as number,
    unit: record.unit as InputApplication["unit"],
    applicationDate: toISODate(record.applicationDate as string) as string,
    method: (record.method as string) || undefined,
    weatherAtApplication: (record.weatherAtApplication as string) || undefined,
    preHarvestIntervalDays: (record.preHarvestIntervalDays as number) ?? undefined,
    appliedBy: (record.appliedBy as string) || undefined,
    cost: (record.cost as InputApplication["cost"]) || undefined,
    createdAt: record.created as string,
  };
}

function mapHarvestRecord(record: Record<string, unknown>): HarvestRecord {
  return {
    id: record.id as string,
    cropCycleId: record.cropCycleId as string,
    harvestDate: toISODate(record.harvestDate as string) as string,
    quantityKg: record.quantityKg as number,
    qualityGrade: (record.qualityGrade as string) || undefined,
    laborUsed: (record.laborUsed as number) || undefined,
    destinationInventoryItemId: (record.destinationInventoryItemId as string) || undefined,
    createdAt: record.created as string,
  };
}

// land_parcels has existed since pb_migrations/002_land_parcels_collection.js
// but was never wired to real data — /crops pages were reading
// lib/mock/crops.ts's MOCK_LAND_PARCELS this whole time despite the real
// collection sitting unused.
export async function getLandParcels(): Promise<LandParcel[]> {
  const pb = await getServerPb();
  const records = await pb.collection("land_parcels").getFullList({ sort: "name" });
  return records.map(mapLandParcel);
}

export async function getLandParcelById(id: string): Promise<LandParcel | null> {
  const pb = await getServerPb();
  try {
    const record = await pb.collection("land_parcels").getOne(id);
    return mapLandParcel(record);
  } catch {
    return null;
  }
}

export async function getCropCycles(): Promise<CropCycle[]> {
  const pb = await getServerPb();
  const records = await pb.collection("crop_cycles").getFullList({ sort: "-plantingDate" });
  return records.map(mapCropCycle);
}

export async function getInputApplications(): Promise<InputApplication[]> {
  const pb = await getServerPb();
  const records = await pb.collection("input_applications").getFullList({ sort: "-applicationDate" });
  return records.map(mapInputApplication);
}

export async function getHarvestRecords(): Promise<HarvestRecord[]> {
  const pb = await getServerPb();
  const records = await pb.collection("harvest_records").getFullList({ sort: "-harvestDate" });
  return records.map(mapHarvestRecord);
}

export type InputApplicationInput = {
  cropCycleId: string;
  type: InputApplicationType;
  productName: string;
  quantityUsed: number;
  unit: InputApplication["unit"];
  applicationDate: string;
  inventoryItemId?: string;
};

export async function createInputApplication(input: InputApplicationInput): Promise<InputApplication> {
  const pb = await getServerPb();
  const record = await pb.collection("input_applications").create(input);
  return mapInputApplication(record);
}

export type HarvestRecordInput = {
  cropCycleId: string;
  harvestDate: string;
  quantityKg: number;
  qualityGrade?: string;
};

/**
 * Creating a harvest record also bumps the parent crop_cycle's running
 * `actualYieldToDateKg` — same "two writes, one logical operation, not
 * atomic" caveat as createStockMovement (lib/data/inventory.ts) and
 * upsertMilkLog (lib/data/dairy-records.ts). PocketBase's JS SDK has no
 * cross-collection transaction.
 */
export async function createHarvestRecord(input: HarvestRecordInput): Promise<HarvestRecord> {
  const pb = await getServerPb();

  const record = await pb.collection("harvest_records").create(input);

  const cycle = await pb.collection("crop_cycles").getOne(input.cropCycleId);
  const nextYield = (cycle.actualYieldToDateKg as number) + input.quantityKg;
  await pb.collection("crop_cycles").update(input.cropCycleId, { actualYieldToDateKg: nextYield });

  return mapHarvestRecord(record);
}

export type LandParcelInput = Omit<LandParcel, "id" | "createdAt" | "updatedAt">;

/**
 * The actual fix for "no fields to input" on crops/plots: land_parcels
 * and crop_cycles both had reads plus adjacent writes (input
 * applications, harvest records logged AGAINST an existing cycle) but no
 * way to create a plot or a planting in the first place — same gap
 * pattern already found and fixed for inventory/sheep/poultry.
 */
export async function createLandParcel(input: LandParcelInput): Promise<LandParcel> {
  const pb = await getServerPb();
  const record = await pb.collection("land_parcels").create(input);
  return mapLandParcel(record);
}

export async function updateLandParcel(id: string, input: Partial<LandParcelInput>): Promise<LandParcel> {
  const pb = await getServerPb();
  const record = await pb.collection("land_parcels").update(id, input);
  return mapLandParcel(record);
}

export type CropCycleInput = Omit<CropCycle, "id" | "createdAt" | "updatedAt">;

export async function createCropCycle(input: CropCycleInput): Promise<CropCycle> {
  const pb = await getServerPb();
  const record = await pb.collection("crop_cycles").create(input);
  return mapCropCycle(record);
}

export async function updateCropCycle(id: string, input: Partial<CropCycleInput>): Promise<CropCycle> {
  const pb = await getServerPb();
  const record = await pb.collection("crop_cycles").update(id, input);
  return mapCropCycle(record);
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}
