import { Topbar } from "@/components/layout/Topbar";
import { PoultryTabs } from "@/components/livestock/PoultryTabs";
import { EggLogView } from "@/components/livestock/EggLogView";
import { getEggCollectionLogs, getPoultryFlocks, getCurrentUserRole } from "@/lib/data/poultry";
import { getHealthRecords } from "@/lib/data/health";
import { canManagePoultry } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function EggLogPage() {
  const [flocks, eggLogs, healthRecords, role, activeUserName] = await Promise.all([
    getPoultryFlocks(),
    getEggCollectionLogs(),
    getHealthRecords(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <PoultryTabs />
        <EggLogView flocks={flocks} eggLogs={eggLogs} healthRecords={healthRecords} canEdit={canManagePoultry(role)} />
      </main>
    </>
  );
}
