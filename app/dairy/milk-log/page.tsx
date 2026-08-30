import { Topbar } from "@/components/layout/Topbar";
import { DairyTabs } from "@/components/dairy/DairyTabs";
import { MilkLogView } from "@/components/dairy/MilkLogView";
import { getCattleList } from "@/lib/data/cattle";
import { getMilkLogs, getLactationCycles, getCurrentUserRole } from "@/lib/data/dairy-records";
import { getHealthRecords } from "@/lib/data/health";
import { canManageMilkLogs } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function MilkLogPage() {
  const [cattle, milkLogs, lactationCycles, healthRecords, role, activeUserName] = await Promise.all([
    getCattleList(),
    getMilkLogs(),
    getLactationCycles(),
    getHealthRecords(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <DairyTabs />
        <MilkLogView
          cattle={cattle}
          milkLogs={milkLogs}
          lactationCycles={lactationCycles}
          healthRecords={healthRecords}
          canEdit={canManageMilkLogs(role)}
        />
      </main>
    </>
  );
}
