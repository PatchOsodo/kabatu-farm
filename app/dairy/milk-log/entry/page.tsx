import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Topbar } from "@/components/layout/Topbar";
import { DairyTabs } from "@/components/dairy/DairyTabs";
import { MilkQuickEntry } from "@/components/dairy/MilkQuickEntry";
import { getCattleList } from "@/lib/data/cattle";
import { getMilkLogs, getLactationCycles, getCurrentUserRole, getCurrentUserId } from "@/lib/data/dairy-records";
import { getHealthRecords } from "@/lib/data/health";
import { canManageMilkLogs } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export const metadata: Metadata = {
  manifest: "/manifest.json",
};

export default async function MilkEntryPage() {
  const [cattle, milkLogs, lactationCycles, healthRecords, role, userId, activeUserName] = await Promise.all([
    getCattleList(),
    getMilkLogs(),
    getLactationCycles(),
    getHealthRecords(),
    getCurrentUserRole(),
    getCurrentUserId(),
    getSessionUserName(),
  ]);

  // Server-side gate, not just hiding the button on the grid page — the
  // same defense-in-depth pattern used elsewhere (real enforcement is
  // still PocketBase's own collection rule via upsertMilkLogAction, and
  // now also the direct-write path this page's client component uses).
  if (!canManageMilkLogs(role) || !userId) {
    redirect("/dairy/milk-log");
  }

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <DairyTabs />
        <h1 className="font-display text-2xl text-ink-900 mb-6">Enter milk</h1>
        <MilkQuickEntry
          cattle={cattle}
          milkLogs={milkLogs}
          lactationCycles={lactationCycles}
          healthRecords={healthRecords}
          currentUserId={userId}
        />
      </main>
    </>
  );
}
