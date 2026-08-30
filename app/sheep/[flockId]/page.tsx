import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { SheepTabs } from "@/components/livestock/SheepTabs";
import { QuarantineBadge } from "@/components/ui/QuarantineBadge";
import { LinkButton } from "@/components/ui/Button";
import { FlockPhotoUploader } from "@/components/ui/FlockPhotoUploader";
import { getSessionUserName } from "@/lib/session";
import {
  getLambingRecords,
  getMeatOffFlockRecords,
  getSheepFlockById,
  getWoolHarvestRecords,
  getCurrentUserRole,
} from "@/lib/data/sheep";
import { getHealthRecords } from "@/lib/data/health";
import { getActiveQuarantine } from "@/lib/quarantine";
import { getFileUrl } from "@/lib/pb";
import { canManageSheep } from "@/lib/authz";
import { updateSheepFlockPhotoAction } from "@/lib/actions/sheep";

function money(amount?: number) {
  if (amount === undefined) return "—";
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export default async function SheepFlockDetailPage({ params }: { params: Promise<{ flockId: string }> }) {
  const { flockId } = await params;
  const [flock, lambingRecords, woolRecords, meatRecords, healthRecords, activeUserName, role] = await Promise.all([
    getSheepFlockById(flockId),
    getLambingRecords(),
    getWoolHarvestRecords(),
    getMeatOffFlockRecords(),
    getHealthRecords(),
    getSessionUserName(),
    getCurrentUserRole(),
  ]);
  if (!flock) notFound();

  // Sheep are tracked at flock granularity everywhere in this app —
  // lambing, wool, meat sales are all per-flock, not per-ewe — so a
  // flock-level quarantine (HealthRecord.animalId = flock.id) is
  // consistent with that model, not a workaround for lacking individual
  // animal tracking.
  const activeQuarantine = getActiveQuarantine(healthRecords, flock.id);

  const lambing = lambingRecords
    .filter((l) => l.flockId === flock.id)
    .sort((a, b) => new Date(b.lambingDate).getTime() - new Date(a.lambingDate).getTime());
  const wool = woolRecords.filter((w) => w.flockId === flock.id);
  const meat = meatRecords.filter((m) => m.flockId === flock.id);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-4xl">
        <SheepTabs />

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink-900">{flock.flockName}</h1>
            <p className="text-sm text-ink-500 mt-1 capitalize">
              {flock.breed} · {flock.purpose.replace("_", " ")}
            </p>
          </div>
          {canManageSheep(role) && (
            <LinkButton href={`/sheep/${flock.id}/edit`} variant="secondary" size="sm">
              Edit
            </LinkButton>
          )}
        </div>

        {activeQuarantine && (
          <div className="mb-6">
            <QuarantineBadge activeQuarantine={activeQuarantine} />
          </div>
        )}

        {canManageSheep(role) && (
          <div className="mb-8">
            <FlockPhotoUploader
              action={updateSheepFlockPhotoAction.bind(null, flock.id)}
              existingPhotoUrl={getFileUrl("sheep_flocks", flock.id, flock.photo)}
            />
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Fact label="Rams" value={String(flock.ramCount)} />
          <Fact label="Ewes" value={String(flock.eweCount)} />
          <Fact label="Lambs" value={String(flock.lambCount)} />
          <Fact label="Total head" value={String(flock.currentCount)} />
        </section>

        <section className="mb-8 border border-line rounded p-5">
          <h2 className="font-display text-lg text-ink-900 mb-4">Lambing Records</h2>
          {lambing.length === 0 ? (
            <p className="text-sm text-ink-500">No lambing events recorded.</p>
          ) : (
            <ul className="space-y-3">
              {lambing.map((l) => (
                <li key={l.id} className="flex items-start gap-4 text-sm border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <span className="font-mono-data text-xs text-ink-500 w-24 shrink-0 pt-0.5">
                    {l.lambingDate}
                  </span>
                  <div className="flex-1">
                    <p className="text-ink-900">
                      {l.lambsBornAlive} born alive
                      {l.lambsStillborn > 0 ? `, ${l.lambsStillborn} stillborn` : ""}
                    </p>
                    {l.complications && <p className="text-ink-500 text-xs mt-0.5">{l.complications}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {flock.purpose !== "meat" && (
          <section className="mb-8 border border-line rounded p-5">
            <h2 className="font-display text-lg text-ink-900 mb-4">Wool Harvests</h2>
            {wool.length === 0 ? (
              <p className="text-sm text-ink-500">No shearing recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {wool.map((w) => (
                  <li key={w.id} className="flex items-start gap-4 text-sm border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <span className="font-mono-data text-xs text-ink-500 w-24 shrink-0 pt-0.5">
                      {w.shearingDate}
                    </span>
                    <div className="flex-1">
                      <p className="text-ink-900">
                        {w.sheepShorn} sheared · {w.totalWeightKg} kg{" "}
                        {w.gradeQuality && <span className="text-ink-500">({w.gradeQuality})</span>}
                      </p>
                      {w.buyer && <p className="text-ink-500 text-xs mt-0.5">Sold to {w.buyer}</p>}
                    </div>
                    <span className="font-mono-data text-ink-900">{money(w.saleValue?.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {flock.purpose !== "wool" && (
          <section className="border border-line rounded p-5">
            <h2 className="font-display text-lg text-ink-900 mb-4">Meat Off-take</h2>
            {meat.length === 0 ? (
              <p className="text-sm text-ink-500">No sales recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {meat.map((m) => (
                  <li key={m.id} className="flex items-start gap-4 text-sm border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <span className="font-mono-data text-xs text-ink-500 w-24 shrink-0 pt-0.5">{m.date}</span>
                    <div className="flex-1">
                      <p className="text-ink-900">
                        {m.animalsSold} sold
                        {m.totalLiveWeightKg ? ` · ${m.totalLiveWeightKg} kg live weight` : ""}
                      </p>
                      {m.buyer && <p className="text-ink-500 text-xs mt-0.5">{m.buyer}</p>}
                    </div>
                    <span className="font-mono-data text-ink-900">{money(m.saleValue?.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="text-sm text-ink-900 mt-0.5">{value}</dd>
    </div>
  );
}
