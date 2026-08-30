import type { LambingRecord, MeatOffFlockRecord, SheepFlock, WoolHarvestRecord } from "@/types/farm";

const now = new Date().toISOString();

export const MOCK_SHEEP_FLOCKS: SheepFlock[] = [
  {
    id: "sf1",
    flockName: "Dorper Flock A",
    breed: "Dorper",
    purpose: "meat",
    currentCount: 58,
    ramCount: 3,
    eweCount: 39,
    lambCount: 16,
    currentPlotId: "plot-4",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "sf2",
    flockName: "Merino Flock",
    breed: "Merino",
    purpose: "wool",
    currentCount: 26,
    ramCount: 2,
    eweCount: 20,
    lambCount: 4,
    currentPlotId: "plot-5",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "sf3",
    flockName: "Red Maasai Flock",
    breed: "Red Maasai",
    purpose: "dual_purpose",
    currentCount: 34,
    ramCount: 2,
    eweCount: 24,
    lambCount: 8,
    currentPlotId: "plot-4",
    createdAt: now,
    updatedAt: now,
  },
];

export const MOCK_LAMBING_RECORDS: LambingRecord[] = [
  {
    id: "lr1",
    flockId: "sf1",
    lambingDate: "2026-07-18",
    lambsBornAlive: 3,
    lambsStillborn: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lr2",
    flockId: "sf1",
    lambingDate: "2026-06-29",
    lambsBornAlive: 2,
    lambsStillborn: 1,
    complications: "Breech position, assisted delivery",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lr3",
    flockId: "sf3",
    lambingDate: "2026-07-10",
    lambsBornAlive: 2,
    lambsStillborn: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lr4",
    flockId: "sf2",
    lambingDate: "2026-06-02",
    lambsBornAlive: 1,
    lambsStillborn: 0,
    createdAt: now,
    updatedAt: now,
  },
];

export const MOCK_WOOL_HARVESTS: WoolHarvestRecord[] = [
  {
    id: "wh1",
    flockId: "sf2",
    shearingDate: "2026-05-14",
    sheepShorn: 22,
    totalWeightKg: 84.5,
    gradeQuality: "fine",
    buyer: "Rift Valley Wool Cooperative",
    saleValue: { amount: 38700, currency: "KES" },
    createdAt: now,
  },
];

export const MOCK_MEAT_OFFTAKE: MeatOffFlockRecord[] = [
  {
    id: "mo1",
    flockId: "sf1",
    date: "2026-07-05",
    animalsSold: 6,
    totalLiveWeightKg: 258,
    buyer: "Kiamaiko Livestock Market",
    saleValue: { amount: 96000, currency: "KES" },
    createdAt: now,
  },
  {
    id: "mo2",
    flockId: "sf3",
    date: "2026-06-20",
    animalsSold: 4,
    totalLiveWeightKg: 172,
    buyer: "Local butchery",
    saleValue: { amount: 61000, currency: "KES" },
    createdAt: now,
  },
];
