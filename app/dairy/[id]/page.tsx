import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { DairyTabs } from "@/components/dairy/DairyTabs";
import { StatusPill } from "@/components/dairy/StatusPill";
import { QuarantineBadge } from "@/components/ui/QuarantineBadge";
import { MilkTrendBars } from "@/components/dairy/MilkTrendBars";
import { CalvingForm } from "@/components/dairy/CalvingForm";
import { LactationStageControl } from "@/components/dairy/LactationStageControl";
import { HealthRecordForm } from "@/components/health/HealthRecordForm";
import { LinkButton } from "@/components/ui/Button";
import { getCattleById, getCurrentUserRole } from "@/lib/data/cattle";
import { getBreedingRecords, getLactationCycles, getMilkLogs } from "@/lib/data/dairy-records";
import { getHealthRecords } from "@/lib/data/health";
import { getActiveQuarantine } from "@/lib/quarantine";
import { canManageCattle, canManageClinicalRecords } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";
import { createCalvingRecordAction, updateLactationStageAction } from "@/lib/actions/dairy-records";

function ageFromDob(dob?: string) {
  if (!dob) return "—";
  const years = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 1) return `${Math.round(years * 12)} mo`;
  return `${Math.floor(years)} yr`;
}

export default async function CattleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cattle, role, activeUserName, breedingRecords, lactationCycles, milkLogs, healthRecords] = await Promise.all([
    getCattleById(id),
                                                                                                                      getCurrentUserRole(),
                                                                                                                      getSessionUserName(),
                                                                                                                      getBreedingRecords(),
                                                                                                                      getLactationCycles(),
                                                                                                                      getMilkLogs(),
                                                                                                                      getHealthRecords(),
  ]);
  if (!cattle) notFound();

  // Convention: HealthRecord.animalId stores the animal's own PocketBase
  // record id (cattle.id here) — it's a plain text field, not a relation,
  // since one health_records collection spans cattle/sheep/poultry_flock,
  // which PocketBase relations can't polymorphically target.
  const activeQuarantine = getActiveQuarantine(healthRecords, cattle.id);

  const lactation = lactationCycles.find((l) => l.cattleId === cattle.id);
  const breedingHistory = breedingRecords
  .filter((b) => b.cattleId === cattle.id)
  .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const iso = date.toISOString().slice(0, 10);
    const liters = milkLogs
    .filter((m) => m.cattleId === cattle.id && m.date === iso)
    .reduce((sum, m) => sum + m.liters, 0);
    return { date: iso, liters: Math.round(liters * 10) / 10 };
  });
  const hasMilkHistory = last7.some((d) => d.liters > 0);

  return (
    <>
    <Topbar activeUserName={activeUserName} />
    <main className="flex-1 px-6 md:px-10 py-8 max-w-4xl">
    <DairyTabs />

    <div className="flex items-start justify-between mb-8">
    <div>
    <p className="font-mono-data text-xs text-ink-500 mb-1">{cattle.tagId}</p>
    <h1 className="font-display text-3xl text-ink-900">{cattle.name ?? "Unnamed"}</h1>
    <p className="text-sm text-ink-500 mt-1 capitalize">
    {cattle.breed} · {cattle.category} · {ageFromDob(cattle.dob)}
    </p>
    </div>
    <div className="flex items-start gap-2">
    <StatusPill value={cattle.status} />
    <StatusPill value={cattle.breedingStatus} />
    {canManageCattle(role) && (
      <LinkButton href={`/dairy/${cattle.id}/edit`} variant="secondary" size="sm">
      Edit
      </LinkButton>
    )}
    </div>
    </div>

    {activeQuarantine && (
      <div className="mb-6">
      <QuarantineBadge activeQuarantine={activeQuarantine} />
      </div>
    )}

    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
    <Fact label="DOB" value={cattle.dob ?? "—"} />
    <Fact label="Sex" value={cattle.sex} />
    <Fact
    label="Acquisition"
    value={cattle.acquisitionType === "born_on_farm" ? "Born on farm" : "Purchased"}
    />
    <Fact label="Acquired" value={cattle.acquisitionDate} />
    </section>

    {hasMilkHistory && (
      <section className="mb-8 border border-line rounded p-5 bg-parchment-100/40">
      <div className="flex items-baseline justify-between mb-4">
      <h2 className="font-display text-lg text-ink-900">7-Day Milk Trend</h2>
      <span className="text-xs text-ink-500 font-mono-data">Liters / day, all sessions</span>
      </div>
      <MilkTrendBars data={last7} />
      </section>
    )}

    {lactation && (
      <section className="mb-8 border border-line rounded p-5">
      <h2 className="font-display text-lg text-ink-900 mb-4">Current Lactation</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
      <Fact label="Stage" value={lactation.stage} capitalize />
      <Fact label="Lactation #" value={String(lactation.lactationNumber)} />
      <Fact
      label="Peak yield"
      value={lactation.peakYieldLiters ? `${lactation.peakYieldLiters} L` : "—"}
      />
      <Fact label="Total to date" value={`${lactation.totalYieldLitersToDate.toLocaleString("en-KE")} L`} />
      </dl>
      {canManageClinicalRecords(role) && (
        <LactationStageControl
        action={updateLactationStageAction.bind(null, lactation.id, cattle.id)}
        currentStage={lactation.stage}
        />
      )}
      </section>
    )}

    {cattle.sex === "female" && canManageClinicalRecords(role) && (!lactation || lactation.stage === "dry") && (
      <div className="mb-8">
      <CalvingForm action={createCalvingRecordAction.bind(null, cattle.id)} />
      </div>
    )}

    {canManageClinicalRecords(role) && (
      <div className="mb-8">
      <HealthRecordForm animalId={cattle.id} animalType="cattle" />
      </div>
    )}

    <section className="border border-line rounded p-5">
    <h2 className="font-display text-lg text-ink-900 mb-4">Breeding History</h2>
    {breedingHistory.length === 0 ? (
      <p className="text-sm text-ink-500">No breeding events recorded.</p>
    ) : (
      <ul className="space-y-3">
      {breedingHistory.map((b) => (
        <li key={b.id} className="flex items-start gap-4 text-sm border-t border-line pt-3 first:border-t-0 first:pt-0">
        <span className="font-mono-data text-xs text-ink-500 w-24 shrink-0 pt-0.5">{b.eventDate}</span>
        <div className="flex-1">
        <p className="text-ink-900 capitalize">{b.eventType.replace(/_/g, " ")}</p>
        {b.sireInfo && <p className="text-ink-500 text-xs mt-0.5">{b.sireInfo}</p>}
        {b.expectedCalvingDate && (
          <p className="text-ink-500 text-xs mt-0.5">
          Expected calving: {b.expectedCalvingDate}
          </p>
        )}
        </div>
        {b.outcome && <StatusPill value={b.outcome} />}
        </li>
      ))}
      </ul>
    )}
    </section>
    </main>
    </>
  );
}

function Fact({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
    <dt className="text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
    <dd className={`text-sm text-ink-900 mt-0.5 ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
