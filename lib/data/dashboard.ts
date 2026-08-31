import { getCattleList } from "@/lib/data/cattle";
import { getMilkLogs } from "@/lib/data/dairy-records";
import { getSheepFlocks } from "@/lib/data/sheep";
import { getPoultryFlocks, getEggCollectionLogs } from "@/lib/data/poultry";
import { getCropCycles, getLandParcels } from "@/lib/data/crops";
import { getTransactions } from "@/lib/data/financials";
import { getTasks } from "@/lib/data/tasks";
import { getOpenAlerts } from "@/lib/data/alerts";
import type { Enterprise, EnterpriseSummary, FarmDashboardData, FinancialTransaction, Money } from "@/types/farm";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-08"
}

function sumMoney(transactions: FinancialTransaction[], type: "income" | "expense"): Money {
  const total = transactions
  .filter((t) => t.type === type)
  .reduce((sum, t) => sum + t.amount.amount, 0);
  return { amount: total, currency: "KES" };
}

/**
 * Real replacement for the old MOCK_DASHBOARD in app/page.tsx. Pulls from
 * every module's existing data-layer functions rather than adding new
 * PocketBase queries — this page was the last one still on fabricated
 * numbers (42 cattle, 312L milk, etc.) despite every module underneath it
 * having been wired to real data for a while; those numbers just never
 * got connected up to the landing page. Fixed 2026-08-07.
 *
 * IMPORTANT: "/" is the app's one public/guest-accessible route (see
 * proxy.ts). financial_transactions, tasks, and alerts all have
 * `listRule: "@request.auth.id != ''"` at the PocketBase level (verified
 * by reading pb_migrations/013_financials_and_tasks.js and 014_alerts.js
 * directly) — an unauthenticated guest gets a real 403 from PocketBase
 * for all three. Those three calls are deliberately NOT in the main
 * Promise.all below; a 403 there is caught and degrades to an empty/zero
 * result rather than throwing and crashing the public landing page for
 * every guest visitor. This matches the access-control design rather
 * than fighting it — a guest genuinely isn't supposed to see financial
 * figures, so month income/expense showing as 0 for a guest is correct
 * restriction, not missing data. (Whether that should instead render as
 * an explicit "sign in to see" state rather than a bare 0 is a UI
 * judgment call worth a decision from the person, not something to
 * silently pick here.)
 */
export async function getFarmDashboardData(): Promise<FarmDashboardData> {
  const [cattle, milkLogs, sheepFlocks, poultryFlocks, eggLogs, cropCycles, landParcels] = await Promise.all([
    getCattleList(),
                                                                                                             getMilkLogs(),
                                                                                                             getSheepFlocks(),
                                                                                                             getPoultryFlocks(),
                                                                                                             getEggCollectionLogs(),
                                                                                                             getCropCycles(),
                                                                                                             getLandParcels(),
  ]);

  const [transactions, tasks, openAlerts] = await Promise.all([
    getTransactions().catch(() => []),
                                                              getTasks().catch(() => []),
                                                              getOpenAlerts().catch(() => []),
  ]);

  const today = todayISODate();
  const thisMonth = currentYearMonth();
  const monthTx = (enterprise: Enterprise) =>
  transactions.filter((t) => t.enterprise === enterprise && t.date.startsWith(thisMonth));
  const alertsFor = (enterprise: Enterprise) => openAlerts.filter((a) => a.enterprise === enterprise).length;

  // ── dairy ──────────────────────────────────────────────────────────
  const activeCattle = cattle.filter((c) => c.status === "active");
  const todayMilkLiters = milkLogs
  .filter((m) => m.date === today)
  .reduce((sum, m) => sum + m.liters, 0);
  const dairyTx = monthTx("dairy");

  // ── sheep ──────────────────────────────────────────────────────────
  const sheepHead = sheepFlocks.reduce((sum, f) => sum + f.currentCount, 0);
  const sheepTx = monthTx("sheep");

  // ── poultry ────────────────────────────────────────────────────────
  const totalBirds = poultryFlocks.reduce((sum, f) => sum + f.currentBirdCount, 0);
  const todayEggs = eggLogs.filter((e) => e.date === today).reduce((sum, e) => sum + e.eggsCollected, 0);
  const poultryTx = monthTx("poultry");

  // ── crops ──────────────────────────────────────────────────────────
  // "Active" here means genuinely in-progress in the field — every status
  // between planting and harvest, not just CropCycleStatus's "growing".
  // "planned"/"land_prep" haven't broken ground yet; "completed"/"failed"
  // are done. Real enum values only (checked against types/farm.ts —
  // there is no "active" status, that was a wrong guess caught before
  // this shipped).
  const IN_PROGRESS_STATUSES = new Set(["planted", "growing", "flowering_fruiting", "harvesting"]);
  const activeCycles = cropCycles.filter((c) => IN_PROGRESS_STATUSES.has(c.status));
  const activePlotIds = new Set(activeCycles.map((c) => c.plotId));
  const activeAcres = activeCycles.reduce((sum, c) => sum + c.areaPlantedAcres, 0);
  const cropsTx = monthTx("crops");

  const enterprises: EnterpriseSummary[] = [
    {
      enterprise: "dairy",
      headline: `${cattle.length} cattle · ${activeCattle.length} active`,
      todayOutput: todayMilkLiters > 0 ? `${todayMilkLiters.toLocaleString("en-KE")} L milk` : undefined,
      openAlerts: alertsFor("dairy"),
      monthIncome: sumMoney(dairyTx, "income"),
      monthExpense: sumMoney(dairyTx, "expense"),
      hasRecords: cattle.length > 0,
    },
    {
      enterprise: "sheep",
      headline: `${sheepFlocks.length} flock${sheepFlocks.length === 1 ? "" : "s"} · ${sheepHead} head`,
      todayOutput: undefined, // wool/meat sales aren't a daily metric — no honest "today" figure to show
      openAlerts: alertsFor("sheep"),
      monthIncome: sumMoney(sheepTx, "income"),
      monthExpense: sumMoney(sheepTx, "expense"),
      hasRecords: sheepFlocks.length > 0,
    },
    {
      enterprise: "poultry",
      headline: `${poultryFlocks.length} flock${poultryFlocks.length === 1 ? "" : "s"} · ${totalBirds} birds`,
      todayOutput: todayEggs > 0 ? `${todayEggs} eggs` : undefined,
      openAlerts: alertsFor("poultry"),
      monthIncome: sumMoney(poultryTx, "income"),
      monthExpense: sumMoney(poultryTx, "expense"),
      hasRecords: poultryFlocks.length > 0,
    },
    {
      enterprise: "crops",
      headline:
      landParcels.length > 0
      ? `${activePlotIds.size} plot${activePlotIds.size === 1 ? "" : "s"} · ${activeAcres.toLocaleString("en-KE")} acres active`
      : "No plots recorded yet",
      todayOutput: undefined, // no clean daily crop metric analogous to milk/eggs
      openAlerts: alertsFor("crops"),
      monthIncome: sumMoney(cropsTx, "income"),
      monthExpense: sumMoney(cropsTx, "expense"),
      hasRecords: landParcels.length > 0,
    },
  ];

  return {
    farmName: "Kabatu Farm",
    asOf: new Date().toISOString(),
    enterprises,
    totalAlerts: openAlerts,
    upcomingTasks: tasks
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5),
  };
}
