/**
 * KABATU FARM — CORE DATA MODEL
 * Phase 1: Shared types used across every module (Dairy, Livestock, Crops,
 * Inventory, Financials). Designed to map 1:1 onto PocketBase collections,
 * so every entity has a stable `id`, and FK-style references use `*Id` fields.
 */

// ─────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────

export type UUID = string;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // full ISO timestamp

export type Enterprise = "dairy" | "sheep" | "poultry" | "crops";

export interface Timestamps {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Money {
  amount: number;
  currency: "KES"; // locked to KES; widen later if needed
}

/** Generic attachment (vet report, receipt, soil test PDF, animal photo, etc.) */
export interface Attachment {
  id: UUID;
  url: string;
  label: string;
  uploadedAt: ISODateTime;
}

export type UserRole =
| "owner"
| "farm_manager"
| "enterprise_lead" // e.g. dairy supervisor, crop supervisor
| "worker"
| "vet_agronomist" // external/consulting professional
| "accountant";

export interface User extends Timestamps {
  id: UUID;
  fullName: string;
  phone: string;
  role: UserRole;
  enterprises: Enterprise[]; // which modules this user can act in
  active: boolean;
}

// ─────────────────────────────────────────────────────────────
// MODULE 1 — DAIRY CATTLE
// ─────────────────────────────────────────────────────────────

export type CattleCategory = "cow" | "heifer" | "calf" | "bull" | "steer";
export type CattleStatus = "active" | "dry" | "sold" | "deceased" | "culled";
export type BreedingStatus =
| "open"
| "served" // inseminated/served, awaiting confirmation
| "confirmed_pregnant"
| "dry_off"
| "not_applicable"; // calves, bulls

export interface Cattle extends Timestamps {
  id: UUID;
  tagId: string; // physical ear-tag number
  name?: string;
  category: CattleCategory;
  breed: string;
  sex: "female" | "male";
  dob?: ISODate;
  motherId?: UUID; // self-referential lineage
  fatherId?: UUID;
  status: CattleStatus;
  breedingStatus: BreedingStatus;
  acquisitionType: "born_on_farm" | "purchased";
  acquisitionDate: ISODate;
  currentPlotId?: UUID; // where it's grazing/housed, links to LandParcel
  photoUrl?: string; // PocketBase native `file` field — value is a filename, not a full URL; build the accessible URL via lib/pb.ts's file-URL helper
  notes?: string;
}

export interface BreedingRecord extends Timestamps {
  id: UUID;
  cattleId: UUID;
  eventType: "heat_detected" | "served" | "pregnancy_check" | "dried_off" | "calved";
  eventDate: ISODate;
  sireInfo?: string; // bull tag or AI straw/semen code
  technician?: string;
  outcome?: "positive" | "negative" | "pending";
  expectedCalvingDate?: ISODate; // computed from service date, ~283 days
  notes?: string;
}

export interface CalvingRecord extends Timestamps {
  id: UUID;
  motherId: UUID;
  calvingDate: ISODate;
  calfId?: UUID; // links to newly created Cattle record
  calfSex?: "female" | "male";
  outcome: "live_birth" | "stillbirth" | "aborted";
  complications?: string;
  assistedBy?: UUID; // User id
}

/**
 * One row per cow per milking session (most farms milk 2x/day).
 * fatPercent/proteinPercent/safetyStatus (added for Kenya's QBP —
 * Quality-Based Milk Payment — rollout) are all optional: they're
 * typically attached to a periodic lab/collection test, not every
 * single milking, so most rows will have none of the three set.
 */
export interface MilkLog {
  id: UUID;
  cattleId: UUID;
  date: ISODate;
  session: "morning" | "midday" | "evening";
  liters: number;
  recordedBy: UUID; // User id
  createdAt: ISODateTime;
  fatPercent?: number;
  proteinPercent?: number;
  safetyStatus?: "passed" | "failed";
}

export type LactationStage = "early" | "mid" | "late" | "dry";

export interface LactationCycle extends Timestamps {
  id: UUID;
  cattleId: UUID;
  calvingRecordId?: UUID; // what triggered this lactation
  startDate: ISODate;
  expectedDryOffDate?: ISODate;
  endDate?: ISODate; // set when dried off
  stage: LactationStage;
  peakYieldLiters?: number;
  totalYieldLitersToDate: number;
  lactationNumber: number; // 1st, 2nd, 3rd lactation etc.
}

export interface HealthRecord extends Timestamps {
  id: UUID;
  animalId: UUID; // works for cattle, sheep, poultry-flock via animalType
  animalType: "cattle" | "sheep" | "poultry_flock";
  eventType: "vaccination" | "treatment" | "deworming" | "checkup" | "injury" | "illness";
  date: ISODate;
  diagnosis?: string;
  medicineUsed?: string; // links loosely to InventoryItem.name
  dosage?: string;
  administeredBy?: string;
  withdrawalPeriodEndsOn?: ISODate; // critical: milk/meat cannot be sold until this date
  cost?: Money;
  followUpDate?: ISODate;
  notes?: string;
  // Phase 2.1 (Quarantine) additive fields — separate milk/meat withdrawal
  // since the two commercial withdrawal periods genuinely differ.
  // quarantineUntilDate is the single source of truth for "is this animal
  // currently quarantined" (computed as quarantineUntilDate > now), not a
  // separate redundant status field that could drift out of sync with it.
  withdrawalDaysMilk?: number;
  withdrawalDaysMeat?: number;
  quarantineUntilDate?: ISODate;
}

// ─────────────────────────────────────────────────────────────
// MODULE 2 — OTHER LIVESTOCK (Sheep & Poultry)
// ─────────────────────────────────────────────────────────────

export type SheepPurpose = "wool" | "meat" | "dual_purpose" | "breeding_stock";

/** Sheep tracked at flock level, with optional individual tagging for breeding stock */
export interface SheepFlock extends Timestamps {
  id: UUID;
  flockName: string;
  breed: string;
  purpose: SheepPurpose;
  currentCount: number;
  ramCount: number;
  eweCount: number;
  lambCount: number;
  currentPlotId?: UUID;
  photo?: string; // PocketBase native `file` field — filename only, not a full URL
  notes?: string;
}

export interface LambingRecord extends Timestamps {
  id: UUID;
  flockId: UUID;
  eweTagId?: string; // if individually tagged
  lambingDate: ISODate;
  lambsBornAlive: number;
  lambsStillborn: number;
  complications?: string;
}

export interface WoolHarvestRecord {
  id: UUID;
  flockId: UUID;
  shearingDate: ISODate;
  sheepShorn: number;
  totalWeightKg: number;
  gradeQuality?: "fine" | "medium" | "coarse";
  buyer?: string;
  saleValue?: Money;
  createdAt: ISODateTime;
}

export interface MeatOffFlockRecord {
  id: UUID;
  flockId: UUID;
  date: ISODate;
  animalsSold: number;
  totalLiveWeightKg?: number;
  buyer?: string;
  saleValue?: Money;
  createdAt: ISODateTime;
}

export type PoultryType = "layers" | "broilers" | "kienyeji" | "breeders";

export interface PoultryFlock extends Timestamps {
  id: UUID;
  flockName: string;
  type: PoultryType;
  breed: string;
  housingLocation: string; // coop/pen identifier
  currentBirdCount: number;
  dateAcquired: ISODate;
  sourceType: "hatched_on_farm" | "purchased_chicks" | "purchased_point_of_lay";
  ageWeeksAtAcquisition?: number;
  status: "active" | "retired" | "sold_out";
  photo?: string; // PocketBase native `file` field — filename only, not a full URL
}

export interface EggCollectionLog {
  id: UUID;
  flockId: UUID;
  date: ISODate;
  eggsCollected: number;
  eggsBroken: number;
  eggsGraded?: { small: number; medium: number; large: number; jumbo: number };
  recordedBy: UUID;
  createdAt: ISODateTime;
}

export interface PoultryMortalityLog {
  id: UUID;
  flockId: UUID;
  date: ISODate;
  birdsLost: number;
  suspectedCause?: string;
  notes?: string;
  createdAt: ISODateTime;
}

/** Feed efficiency tracking — feed consumed vs output produced, per flock */
export interface FeedConsumptionLog {
  id: UUID;
  flockId: UUID;
  animalType: "poultry_flock" | "sheep" | "cattle";
  date: ISODate;
  feedItemId: UUID; // links to InventoryItem
  quantityKg: number;
  createdAt: ISODateTime;
}

// ─────────────────────────────────────────────────────────────
// MODULE 3 — CROP & FIELD MANAGEMENT
// ─────────────────────────────────────────────────────────────

export type SoilType = "loam" | "clay" | "sandy" | "silt" | "volcanic" | "other";

export interface LandParcel extends Timestamps {
  id: UUID;
  name: string; // e.g. "North Field", "Plot 4B"
  acreage: number;
  soilType?: SoilType;
  lastSoilTestDate?: ISODate;
  soilPH?: number;
  currentUse: "crop" | "grazing" | "fallow" | "livestock_housing" | "infrastructure";
  gpsBoundary?: { lat: number; lng: number }[]; // polygon points, optional
  notes?: string;
}

export type CropLifeCycle = "seasonal" | "perennial";
export type CropCycleStatus =
| "planned"
| "land_prep"
| "planted"
| "growing"
| "flowering_fruiting"
| "harvesting"
| "completed"
| "failed";

  /** A single growing cycle on a plot. Perennial crops (fruit trees, etc.)
   * get repeated HarvestRecord entries against one long-lived CropCycle,
   * while seasonal crops (maize, wheat, beans) open/close a cycle per season. */
  export interface CropCycle extends Timestamps {
    id: UUID;
    plotId: UUID;
    cropName: string; // "Maize", "Irish Potato", "Avocado (Hass)"
    variety?: string;
    lifeCycle: CropLifeCycle;
    status: CropCycleStatus;
    seasonLabel?: string; // e.g. "2026 Long Rains"
    plantingDate?: ISODate;
    expectedHarvestDate?: ISODate;
    areaPlantedAcres: number;
    seedSourceItemId?: UUID; // links to InventoryItem
    seedQuantityUsed?: number;
    forecastYieldKg?: number;
    actualYieldToDateKg: number;
    notes?: string;
  }

  export type InputApplicationType = "fertilizer" | "pesticide" | "herbicide" | "fungicide" | "manure" | "irrigation";

  export interface InputApplication {
    id: UUID;
    cropCycleId: UUID;
    type: InputApplicationType;
    inventoryItemId?: UUID; // links to InventoryItem, null for e.g. plain irrigation
    productName: string;
    quantityUsed: number;
    unit: "kg" | "liters" | "grams" | "ml";
    applicationDate: ISODate;
    method?: string; // "foliar spray", "broadcast", "drip"
    weatherAtApplication?: string;
    preHarvestIntervalDays?: number; // safety window before harvest allowed
    appliedBy?: UUID;
    cost?: Money;
    createdAt: ISODateTime;
  }

  export interface HarvestRecord {
    id: UUID;
    cropCycleId: UUID;
    harvestDate: ISODate;
    quantityKg: number;
    qualityGrade?: string;
    laborUsed?: number; // person-hours or worker count
    destinationInventoryItemId?: UUID; // where it lands in inventory as output stock
    createdAt: ISODateTime;
  }

  // ─────────────────────────────────────────────────────────────
  // MODULE 4 — INVENTORY & INPUTS/OUTPUTS
  // ─────────────────────────────────────────────────────────────

  export type InventoryCategory =
  | "feed"
  | "seed"
  | "medicine_vet"
  | "chemical_agro" // fertilizers, pesticides, herbicides
  | "equipment_consumable"
  | "produce_output"; // milk, eggs, wool, harvested crops held pending sale

  export type Unit = "kg" | "g" | "liters" | "ml" | "bags" | "pieces" | "doses";

  export interface InventoryItem extends Timestamps {
    id: UUID;
    name: string;
    category: InventoryCategory;
    unit: Unit;
    currentQuantity: number;
    reorderThreshold: number; // triggers low-stock alert when currentQuantity <= this
    unitCost?: Money;
    supplier?: string;
    storageLocation?: string;
    linkedEnterprise?: Enterprise; // optional tag: which enterprise mainly consumes/produces this
  }

  export type StockMovementType =
  | "purchase_in"
  | "production_in" // e.g. milk/eggs/harvest entering stock
  | "consumption_out" // fed to animals, applied to crops
  | "sale_out"
  | "spoilage_loss"
  | "adjustment";

  export interface StockMovement {
    id: UUID;
    itemId: UUID;
    type: StockMovementType;
    quantity: number; // always positive; `type` determines direction
    date: ISODate;
    relatedRecordId?: UUID; // e.g. HarvestRecord id, MilkLog id, InputApplication id
    performedBy: UUID;
    notes?: string;
    createdAt: ISODateTime;
  }

  export interface ExpirationBatch {
    id: UUID;
    itemId: UUID;
    batchNumber?: string;
    quantity: number;
    expirationDate: ISODate;
    receivedDate: ISODate;
  }

  // ─────────────────────────────────────────────────────────────
  // MODULE 5 — FINANCIALS & OPERATIONS
  // ─────────────────────────────────────────────────────────────

  export type TransactionType = "income" | "expense";

  export type ExpenseCategory =
  | "feed"
  | "medicine_vet"
  | "seeds_planting_material"
  | "fertilizer_chemicals"
  | "labor_wages"
  | "equipment_maintenance"
  | "utilities"
  | "transport"
  | "other";

  export type IncomeCategory = "milk_sale" | "livestock_sale" | "egg_sale" | "wool_sale" | "crop_sale" | "other";

  export interface FinancialTransaction extends Timestamps {
    id: UUID;
    type: TransactionType;
    enterprise: Enterprise;
    category: ExpenseCategory | IncomeCategory;
    amount: Money;
    date: ISODate;
    description: string;
    relatedRecordId?: UUID; // e.g. links to HarvestRecord, StockMovement, HealthRecord
    attachments?: Attachment[];
    recordedBy: UUID;
  }

  export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  export type TaskPriority = "low" | "medium" | "high" | "urgent";

  export interface Task extends Timestamps {
    id: UUID;
    title: string;
    description?: string;
    enterprise: Enterprise;
    relatedEntityId?: UUID; // e.g. a specific Cattle, LandParcel, PoultryFlock
    assignedTo?: UUID;
    dueDate: ISODate;
    status: TaskStatus;
    priority: TaskPriority;
    recurrence?: "none" | "daily" | "weekly" | "monthly";
    completedAt?: ISODateTime;
  }

  export type AlertType =
  | "low_stock"
  | "expiring_stock"
  | "health_followup_due"
  | "milk_withdrawal_active"
  | "breeding_check_due"
  | "harvest_window_open"
  | "task_overdue";

  export interface Alert {
    id: UUID;
    type: AlertType;
    severity: "info" | "warning" | "critical";
    message: string;
    enterprise: Enterprise;
    relatedRecordId?: UUID;
    createdAt: ISODateTime;
    resolvedAt?: ISODateTime;
  }

  // ─────────────────────────────────────────────────────────────
  // DASHBOARD / AGGREGATE VIEW MODELS
  // (not raw tables — computed shapes the UI consumes)
  // ─────────────────────────────────────────────────────────────

  export interface EnterpriseSummary {
    enterprise: Enterprise;
    headline: string; // e.g. "42 cattle · 18 in milk"
    todayOutput?: string; // e.g. "312 L milk" or "186 eggs"
    openAlerts: number;
    monthIncome: Money;
    monthExpense: Money;
    /**
     * True if this enterprise has at least one underlying record (cattle,
     * sheep flock, poultry flock, or land parcel). Used by the dashboard
     * to distinguish a genuinely empty enterprise ("no plots recorded
     * yet" — a true empty state) from an enterprise with real operational
     * activity whose financial figures happen to be zero this month
     * (which should stay an honest zero, not a friendly empty-state
     * message, since sales aren't yet linked to financial_transactions —
     * see tracker.md's open items).
     */
    hasRecords: boolean;
  }

  export interface FarmDashboardData {
    farmName: string;
    asOf: ISODateTime;
    enterprises: EnterpriseSummary[];
    totalAlerts: Alert[];
    upcomingTasks: Task[];
  }
