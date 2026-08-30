import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { CropsTabs } from "@/components/crops/CropsTabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { LinkButton } from "@/components/ui/Button";
import { getSessionUserName } from "@/lib/session";
import { getCropCycles, getInputApplications, getLandParcelById, getCurrentUserRole } from "@/lib/data/crops";
import { canManageLandParcels } from "@/lib/authz";

export default async function PlotDetailPage({ params }: { params: Promise<{ plotId: string }> }) {
  const { plotId } = await params;
  const [plot, cropCycles, inputApplications, role, activeUserName] = await Promise.all([
    getLandParcelById(plotId),
    getCropCycles(),
    getInputApplications(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);
  if (!plot) notFound();

  const cycles = cropCycles
    .filter((c) => c.plotId === plot.id)
    .sort((a, b) => new Date(b.plantingDate ?? 0).getTime() - new Date(a.plantingDate ?? 0).getTime());

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-4xl">
        <CropsTabs />

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink-900">{plot.name}</h1>
            <p className="text-sm text-ink-500 mt-1 capitalize">{plot.currentUse.replace("_", " ")}</p>
          </div>
          {canManageLandParcels(role) && (
            <LinkButton href={`/crops/${plot.id}/edit`} variant="secondary" size="sm">
              Edit
            </LinkButton>
          )}
        </div>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Fact label="Acreage" value={`${plot.acreage} ac`} />
          <Fact label="Soil type" value={plot.soilType ?? "—"} />
          <Fact label="Soil pH" value={plot.soilPH ? String(plot.soilPH) : "—"} />
          <Fact label="Last soil test" value={plot.lastSoilTestDate ?? "—"} />
        </section>

        <section className="border border-line rounded p-5">
          <h2 className="font-display text-lg text-ink-900 mb-4">Crop Cycle History</h2>
          {cycles.length === 0 ? (
            <p className="text-sm text-ink-500">No crop cycles recorded on this plot yet.</p>
          ) : (
            <ul className="space-y-5">
              {cycles.map((c) => {
                const inputs = inputApplications.filter((i) => i.cropCycleId === c.id);
                const pct = c.forecastYieldKg
                  ? Math.min(100, Math.round((c.actualYieldToDateKg / c.forecastYieldKg) * 100))
                  : null;
                return (
                  <li key={c.id} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-ink-900 font-medium">
                          {c.cropName}
                          {c.variety && <span className="text-ink-500 font-normal"> · {c.variety}</span>}
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5 font-mono-data">
                          {c.plantingDate ?? "—"} → {c.expectedHarvestDate ?? "ongoing"}
                          {c.seasonLabel ? ` · ${c.seasonLabel}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <StatusPill value={c.lifeCycle} />
                        <StatusPill value={c.status} />
                      </div>
                    </div>

                    {c.forecastYieldKg ? (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs font-mono-data text-ink-500 mb-1">
                          <span>
                            {c.actualYieldToDateKg.toLocaleString("en-KE")} kg of{" "}
                            {c.forecastYieldKg.toLocaleString("en-KE")} kg forecast
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-parchment-200 overflow-hidden">
                          <div className="h-full bg-gold-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : null}

                    {inputs.length > 0 && (
                      <div className="mt-3 text-xs text-ink-500 space-y-1">
                        {inputs.map((i) => (
                          <p key={i.id}>
                            <span className="font-mono-data">{i.applicationDate}</span> — {i.productName} (
                            {i.quantityUsed} {i.unit}, {i.type.replace("_", " ")})
                          </p>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
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
