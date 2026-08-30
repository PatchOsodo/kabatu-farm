import { redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PoultryFlockForm } from "@/components/livestock/PoultryFlockForm";
import { createPoultryFlockAction } from "@/lib/actions/poultry";
import { getCurrentUserRole } from "@/lib/data/poultry";
import { canManagePoultry } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function NewPoultryFlockPage() {
  const role = await getCurrentUserRole();
  if (!canManagePoultry(role)) redirect("/poultry");

  const activeUserName = await getSessionUserName();

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">New poultry flock</h1>
        <PoultryFlockForm action={createPoultryFlockAction} cancelHref="/poultry" />
      </main>
    </>
  );
}
