import type { BreedingRecord, Cattle, LactationCycle, MilkLog } from "@/types/farm";

const now = new Date().toISOString();

export const MOCK_CATTLE: Cattle[] = [
  {
    id: "c1",
    tagId: "KF-014",
    name: "Amani",
    category: "cow",
    breed: "Friesian",
    sex: "female",
    dob: "2021-03-12",
    status: "active",
    breedingStatus: "confirmed_pregnant",
    acquisitionType: "born_on_farm",
    acquisitionDate: "2021-03-12",
    currentPlotId: "plot-1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "c2",
    tagId: "KF-021",
    name: "Baraka",
    category: "cow",
    breed: "Ayrshire",
    sex: "female",
    dob: "2020-08-02",
    status: "active",
    breedingStatus: "open",
    acquisitionType: "purchased",
    acquisitionDate: "2022-01-15",
    currentPlotId: "plot-1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "c3",
    tagId: "KF-009",
    name: "Chemutai",
    category: "cow",
    breed: "Friesian x Sahiwal",
    sex: "female",
    dob: "2019-11-20",
    status: "dry",
    breedingStatus: "dry_off",
    acquisitionType: "born_on_farm",
    acquisitionDate: "2019-11-20",
    currentPlotId: "plot-2",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "c4",
    tagId: "KF-030",
    name: "Doto",
    category: "heifer",
    breed: "Friesian",
    sex: "female",
    dob: "2023-06-01",
    status: "active",
    breedingStatus: "served",
    acquisitionType: "born_on_farm",
    acquisitionDate: "2023-06-01",
    currentPlotId: "plot-1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "c5",
    tagId: "KF-002",
    name: "Elgon",
    category: "bull",
    breed: "Friesian",
    sex: "male",
    dob: "2020-02-14",
    status: "active",
    breedingStatus: "not_applicable",
    acquisitionType: "purchased",
    acquisitionDate: "2021-05-01",
    currentPlotId: "plot-3",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "c6",
    tagId: "KF-041",
    name: "Faraja",
    category: "calf",
    breed: "Friesian",
    sex: "female",
    dob: "2026-05-18",
    motherId: "c1",
    status: "active",
    breedingStatus: "not_applicable",
    acquisitionType: "born_on_farm",
    acquisitionDate: "2026-05-18",
    currentPlotId: "plot-1",
    createdAt: now,
    updatedAt: now,
  },
];

/** Only lactating animals appear on the milk log — cows currently "active" and not dry/not_applicable */
export const LACTATING_CATTLE_IDS = ["c1", "c2"];

export const MOCK_LACTATION_CYCLES: LactationCycle[] = [
  {
    id: "lc1",
    cattleId: "c1",
    startDate: "2026-02-10",
    stage: "mid",
    peakYieldLiters: 24,
    totalYieldLitersToDate: 2380,
    lactationNumber: 2,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lc2",
    cattleId: "c2",
    startDate: "2025-12-01",
    stage: "late",
    peakYieldLiters: 19,
    totalYieldLitersToDate: 3210,
    lactationNumber: 3,
    createdAt: now,
    updatedAt: now,
  },
];

export const MOCK_BREEDING_RECORDS: BreedingRecord[] = [
  {
    id: "br1",
    cattleId: "c1",
    eventType: "served",
    eventDate: "2025-11-02",
    sireInfo: "AI - Friesian straw #FR-2291",
    outcome: "positive",
    expectedCalvingDate: "2026-08-12",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "br2",
    cattleId: "c1",
    eventType: "pregnancy_check",
    eventDate: "2025-12-20",
    outcome: "positive",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "br3",
    cattleId: "c2",
    eventType: "heat_detected",
    eventDate: "2026-07-22",
    outcome: "pending",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "br4",
    cattleId: "c4",
    eventType: "served",
    eventDate: "2026-07-10",
    sireInfo: "Elgon (KF-002)",
    outcome: "pending",
    expectedCalvingDate: "2027-04-20",
    createdAt: now,
    updatedAt: now,
  },
];

/** 7 days of milk logs for the two lactating cows, 3 sessions/day */
function buildMockMilkLogs(): MilkLog[] {
  const logs: MilkLog[] = [];
  const sessions: MilkLog["session"][] = ["morning", "midday", "evening"];
  const baseYield: Record<string, Record<MilkLog["session"], number>> = {
    c1: { morning: 9.5, midday: 4, evening: 8.5 },
    c2: { morning: 7, midday: 3, evening: 6.5 },
  };

  const today = new Date();
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const iso = date.toISOString().slice(0, 10);

    for (const cattleId of LACTATING_CATTLE_IDS) {
      for (const session of sessions) {
        const jitter = (Math.random() - 0.5) * 1.2;
        logs.push({
          id: `${cattleId}-${iso}-${session}`,
          cattleId,
          date: iso,
          session,
          liters: Math.max(0, Math.round((baseYield[cattleId][session] + jitter) * 10) / 10),
          recordedBy: "u1",
          createdAt: now,
        });
      }
    }
  }
  return logs;
}

export const MOCK_MILK_LOGS: MilkLog[] = buildMockMilkLogs();
