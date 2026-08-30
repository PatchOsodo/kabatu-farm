import type { EggCollectionLog, FeedConsumptionLog, PoultryFlock, PoultryMortalityLog } from "@/types/farm";

const now = new Date().toISOString();

export const MOCK_POULTRY_FLOCKS: PoultryFlock[] = [
  {
    id: "pf1",
    flockName: "Layers House 1",
    type: "layers",
    breed: "Isa Brown",
    housingLocation: "Coop A",
    currentBirdCount: 420,
    dateAcquired: "2025-09-01",
    sourceType: "purchased_point_of_lay",
    ageWeeksAtAcquisition: 18,
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "pf2",
    flockName: "Kienyeji Free-range",
    type: "kienyeji",
    breed: "Improved Kienyeji",
    housingLocation: "Paddock C",
    currentBirdCount: 140,
    dateAcquired: "2025-11-15",
    sourceType: "hatched_on_farm",
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "pf3",
    flockName: "Broiler Batch 7",
    type: "broilers",
    breed: "Cobb 500",
    housingLocation: "Coop B",
    currentBirdCount: 300,
    dateAcquired: "2026-07-05",
    sourceType: "purchased_chicks",
    ageWeeksAtAcquisition: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
];

function daysBack(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function buildEggLogs(): EggCollectionLog[] {
  const logs: EggCollectionLog[] = [];
  for (let d = 6; d >= 0; d--) {
    const date = daysBack(d);
    logs.push({
      id: `pf1-${date}`,
      flockId: "pf1",
      date,
      eggsCollected: Math.round(340 + Math.random() * 40),
      eggsBroken: Math.round(Math.random() * 6),
      recordedBy: "u1",
      createdAt: now,
    });
    logs.push({
      id: `pf2-${date}`,
      flockId: "pf2",
      date,
      eggsCollected: Math.round(70 + Math.random() * 20),
      eggsBroken: Math.round(Math.random() * 3),
      recordedBy: "u1",
      createdAt: now,
    });
  }
  return logs;
}

export const MOCK_EGG_LOGS: EggCollectionLog[] = buildEggLogs();

export const MOCK_MORTALITY_LOGS: PoultryMortalityLog[] = [
  { id: "ml1", flockId: "pf1", date: daysBack(5), birdsLost: 1, suspectedCause: "Old age", createdAt: now },
  { id: "ml2", flockId: "pf3", date: daysBack(2), birdsLost: 3, suspectedCause: "Heat stress", createdAt: now },
  { id: "ml3", flockId: "pf2", date: daysBack(1), birdsLost: 1, suspectedCause: "Predator", createdAt: now },
];

function buildFeedLogs(): FeedConsumptionLog[] {
  const logs: FeedConsumptionLog[] = [];
  for (let d = 6; d >= 0; d--) {
    const date = daysBack(d);
    logs.push({
      id: `feed-pf1-${date}`,
      flockId: "pf1",
      animalType: "poultry_flock",
      date,
      feedItemId: "inv-layers-mash",
      quantityKg: Math.round((44 + Math.random() * 4) * 10) / 10,
      createdAt: now,
    });
  }
  return logs;
}

export const MOCK_FEED_LOGS: FeedConsumptionLog[] = buildFeedLogs();
