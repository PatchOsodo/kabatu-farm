import { redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { SheepFlockForm } from "@/components/livestock/SheepFlockForm";
import { createSheepFlockAction } from "@/lib/actions/sheep";
import { getCurrentUserRole } from "@/lib/data/sheep";
import { canManageSheep } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function NewSheepFlockPage() {
  const role = await getCurrentUserRole();
  if (!canManageSheep(role)) redirect("/sheep");

  const activeUserName = await getSessionUserName();

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">New sheep flock</h1>
        <SheepFlockForm action={createSheepFlockAction} cancelHref="/sheep" />
      </main>
    </>
  );
}
