import { Topbar } from "@/components/layout/Topbar";
import { PoultryTabs } from "@/components/livestock/PoultryTabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { ViewLink, LinkButton } from "@/components/ui/Button";
import { getPoultryFlocks, getCurrentUserRole } from "@/lib/data/poultry";
import { getHealthRecords } from "@/lib/data/health";
import { getActiveQuarantine } from "@/lib/quarantine";
import { canManagePoultry } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

const TYPE_LABEL: Record<string, string> = {
  layers: "Layers",
  broilers: "Broilers",
  kienyeji: "Kienyeji",
  breeders: "Breeders",
};

export default async function PoultryFlocksPage() {
  const [flocks, healthRecords, role, activeUserName] = await Promise.all([
    getPoultryFlocks(),
    getHealthRecords(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);
  const totalBirds = flocks.reduce((sum, f) => sum + f.currentBirdCount, 0);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <PoultryTabs />

        <div className="flex items-baseline justify-between mb-4">
          <p className="text-sm text-ink-500">
            {flocks.length} flocks · <span className="font-mono-data text-ink-900">{totalBirds}</span> birds total
          </p>
          {canManagePoultry(role) && (
            <LinkButton href="/poultry/new" variant="primary" size="sm">
              + Add flock
            </LinkButton>
          )}
        </div>

        <div className="border border-line rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Flock</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Breed</th>
                <th className="px-4 py-2.5 font-medium">Housing</th>
                <th className="px-4 py-2.5 font-medium text-right">Birds</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {flocks.map((f) => {
                const quarantine = getActiveQuarantine(healthRecords, f.id);
                return (
                  <tr key={f.id} className="border-t border-line hover:bg-parchment-100/40">
                    <td className="px-4 py-2.5">
                      <ViewLink href={`/poultry/${f.id}`}>{f.flockName}</ViewLink>
                      {quarantine && (
                        <span
                          className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger text-white"
                          title={`Quarantined until ${quarantine.quarantineUntilDate}`}
                        >
                          Quarantined
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-700">{TYPE_LABEL[f.type]}</td>
                    <td className="px-4 py-2.5 text-ink-700">{f.breed}</td>
                    <td className="px-4 py-2.5 text-ink-700">{f.housingLocation}</td>
                    <td className="px-4 py-2.5 text-right font-mono-data text-ink-900">
                      {f.currentBirdCount}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill value={f.status} />
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
