import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { SheepFlockForm } from "@/components/livestock/SheepFlockForm";
import { updateSheepFlockAction } from "@/lib/actions/sheep";
import { getSheepFlockById, getCurrentUserRole } from "@/lib/data/sheep";
import { canManageSheep } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function EditSheepFlockPage({ params }: { params: Promise<{ flockId: string }> }) {
  const { flockId } = await params;

  const role = await getCurrentUserRole();
  if (!canManageSheep(role)) redirect(`/sheep/${flockId}`);

  const flock = await getSheepFlockById(flockId);
  if (!flock) notFound();

  const activeUserName = await getSessionUserName();
  const boundAction = updateSheepFlockAction.bind(null, flockId);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">Edit {flock.flockName}</h1>
        <SheepFlockForm action={boundAction} initial={flock} cancelHref={`/sheep/${flockId}`} />
      </main>
    </>
  );
}
