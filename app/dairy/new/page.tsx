import { redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { CattleForm } from "@/components/dairy/CattleForm";
import { createCattleAction } from "@/lib/actions/cattle";
import { getCurrentUserRole } from "@/lib/data/cattle";
import { canManageCattle } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function NewCattlePage() {
  // proxy.ts already requires auth to reach this route at all; this
  // second check is about *role*, not just being logged in — a worker/
  // vet/accountant account can view dairy but shouldn't land on a create
  // form only to have PocketBase reject the submit.
  const role = await getCurrentUserRole();
  if (!canManageCattle(role)) redirect("/dairy");

  const activeUserName = await getSessionUserName();

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">Add Cattle</h1>
        <CattleForm action={createCattleAction} cancelHref="/dairy" />
      </main>
    </>
  );
}
