import { Topbar } from "@/components/layout/Topbar";
import { CropsTabs } from "@/components/crops/CropsTabs";
import { ViewLink, LinkButton } from "@/components/ui/Button";
import { getCropCycles, getLandParcels, getCurrentUserRole } from "@/lib/data/crops";
import { canManageLandParcels } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

const ACTIVE_STATUSES = ["planned", "land_prep", "planted", "growing", "flowering_fruiting", "harvesting"];

const USE_LABEL: Record<string, string> = {
  crop: "Crop",
  grazing: "Grazing",
  fallow: "Fallow",
  livestock_housing: "Livestock housing",
  infrastructure: "Infrastructure",
};

export default async function CropsPlotsPage() {
  const [landParcels, cropCycles, role, activeUserName] = await Promise.all([
    getLandParcels(),
    getCropCycles(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  const totalAcreage = landParcels.reduce((sum, p) => sum + p.acreage, 0);
  const activeCropAcreage = cropCycles
    .filter((c) => ACTIVE_STATUSES.includes(c.status))
    .reduce((sum, c) => sum + c.areaPlantedAcres, 0);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <CropsTabs />

        <div className="flex items-baseline justify-between mb-4">
          <p className="text-sm text-ink-500">
            {landParcels.length} plots · <span className="font-mono-data text-ink-900">{totalAcreage}</span> acres total ·{" "}
            <span className="font-mono-data text-ink-900">{activeCropAcreage}</span> acres under active crop
          </p>
          {canManageLandParcels(role) && (
            <LinkButton href="/crops/new" variant="primary" size="sm">
              + Add plot
            </LinkButton>
          )}
        </div>

        <div className="border border-line rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Plot</th>
                <th className="px-4 py-2.5 font-medium">Acreage</th>
                <th className="px-4 py-2.5 font-medium">Soil</th>
                <th className="px-4 py-2.5 font-medium">Use</th>
                <th className="px-4 py-2.5 font-medium">Active crop</th>
              </tr>
            </thead>
            <tbody>
              {landParcels.map((p) => {
                const activeCycle = cropCycles.find(
                  (c) => c.plotId === p.id && ACTIVE_STATUSES.includes(c.status)
                );
                return (
                  <tr key={p.id} className="border-t border-line hover:bg-parchment-100/40">
                    <td className="px-4 py-2.5">
                      <ViewLink href={`/crops/${p.id}`}>{p.name}</ViewLink>
                    </td>
                    <td className="px-4 py-2.5 font-mono-data text-ink-900">{p.acreage} ac</td>
                    <td className="px-4 py-2.5 text-ink-700 capitalize">
                      {p.soilType ?? "—"}
                      {p.soilPH ? <span className="text-ink-500 text-xs ml-1">pH {p.soilPH}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-ink-700">{USE_LABEL[p.currentUse]}</td>
                    <td className="px-4 py-2.5 text-ink-700">
                      {activeCycle ? activeCycle.cropName : <span className="text-ink-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
