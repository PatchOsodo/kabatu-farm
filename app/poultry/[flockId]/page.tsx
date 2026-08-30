import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PoultryTabs } from "@/components/livestock/PoultryTabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { QuarantineBadge } from "@/components/ui/QuarantineBadge";
import { LinkButton } from "@/components/ui/Button";
import { TrendBars } from "@/components/ui/TrendBars";
import { FlockPhotoUploader } from "@/components/ui/FlockPhotoUploader";
import { getSessionUserName } from "@/lib/session";
import { getEggCollectionLogs, getPoultryFlockById, getPoultryMortalityLogs, getCurrentUserRole } from "@/lib/data/poultry";
import { getHealthRecords } from "@/lib/data/health";
import { getActiveQuarantine } from "@/lib/quarantine";
import { getFileUrl } from "@/lib/pb";
import { canManagePoultry } from "@/lib/authz";
import { updatePoultryFlockPhotoAction } from "@/lib/actions/poultry";
// feed_consumption_logs' access-rule design is explicitly flagged as a
// placeholder, not final (see pb_migrations/010_health_feed.js and the
// handoff notes) — keeping feed efficiency on mock data until that's
// resolved, rather than building real UI on a schema that may still change.
import { MOCK_FEED_LOGS } from "@/lib/mock/poultry";

export default async function PoultryFlockDetailPage({ params }: { params: Promise<{ flockId: string }> }) {
  const { flockId } = await params;
  const [flock, eggLogs, mortalityLogs, healthRecords, activeUserName, role] = await Promise.all([
    getPoultryFlockById(flockId),
    getEggCollectionLogs(),
    getPoultryMortalityLogs(),
    getHealthRecords(),
    getSessionUserName(),
    getCurrentUserRole(),
  ]);
  if (!flock) notFound();

  // Flock-level quarantine, same convention as sheep — poultry flocks are
  // the tracked unit everywhere in this app (egg logs, mortality logs are
  // all per-flock, not per-bird), so HealthRecord.animalId = flock.id
  // matches how everything else about this module already works.
  const activeQuarantine = getActiveQuarantine(healthRecords, flock.id);

  const last7Dates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const eggTrend = last7Dates.map((date) => ({
    date,
    value: eggLogs
      .filter((e) => e.flockId === flock.id && e.date === date)
      .reduce((sum, e) => sum + e.eggsCollected, 0),
  }));
  const hasEggData = eggTrend.some((d) => d.value > 0);

  const mortalityForFlock = mortalityLogs
    .filter((m) => m.flockId === flock.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalLost7d = mortalityForFlock
    .filter((m) => last7Dates.includes(m.date))
    .reduce((sum, m) => sum + m.birdsLost, 0);

  const feedLogsForFlock = MOCK_FEED_LOGS.filter((f) => f.flockId === flock.id);
  const totalFeedKg = feedLogsForFlock.reduce((sum, f) => sum + f.quantityKg, 0);
  const totalEggs7d = eggTrend.reduce((sum, d) => sum + d.value, 0);
  const feedEfficiency = totalFeedKg > 0 ? totalEggs7d / totalFeedKg : null;

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-4xl">
        <PoultryTabs />

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-ink-900">{flock.flockName}</h1>
            <p className="text-sm text-ink-500 mt-1 capitalize">
              {flock.breed} · {flock.type} · {flock.housingLocation}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill value={flock.status} />
            {canManagePoultry(role) && (
              <LinkButton href={`/poultry/${flock.id}/edit`} variant="secondary" size="sm">
                Edit
              </LinkButton>
            )}
          </div>
        </div>

        {canManagePoultry(role) && (
          <div className="mb-8">
            <FlockPhotoUploader
              action={updatePoultryFlockPhotoAction.bind(null, flock.id)}
              existingPhotoUrl={getFileUrl("poultry_flocks", flock.id, flock.photo)}
            />
          </div>
        )}

        {activeQuarantine && (
          <div className="mb-6">
            <QuarantineBadge activeQuarantine={activeQuarantine} />
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Fact label="Current birds" value={String(flock.currentBirdCount)} />
          <Fact label="Acquired" value={flock.dateAcquired} />
          <Fact
            label="Source"
            value={flock.sourceType.replace(/_/g, " ")}
          />
          <Fact label="Lost (7d)" value={String(totalLost7d)} />
        </section>

        {hasEggData && (
          <section className="mb-8 border border-line rounded p-5 bg-parchment-100/40">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-lg text-ink-900">7-Day Egg Collection</h2>
              {feedEfficiency !== null && (
                <span className="text-xs text-ink-500 font-mono-data">
                  {feedEfficiency.toFixed(1)} eggs / kg feed
                </span>
              )}
            </div>
            <TrendBars data={eggTrend} />
          </section>
        )}

        <section className="border border-line rounded p-5">
          <h2 className="font-display text-lg text-ink-900 mb-4">Mortality Log</h2>
          {mortalityForFlock.length === 0 ? (
            <p className="text-sm text-ink-500">No losses recorded — clean run.</p>
          ) : (
            <ul className="space-y-3">
              {mortalityForFlock.map((m) => (
                <li key={m.id} className="flex items-start gap-4 text-sm border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <span className="font-mono-data text-xs text-ink-500 w-24 shrink-0 pt-0.5">{m.date}</span>
                  <div className="flex-1">
                    <p className="text-ink-900">{m.birdsLost} bird{m.birdsLost === 1 ? "" : "s"} lost</p>
                    {m.suspectedCause && <p className="text-ink-500 text-xs mt-0.5">{m.suspectedCause}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="text-sm text-ink-900 mt-0.5 capitalize">{value}</dd>
    </div>
  );
}
