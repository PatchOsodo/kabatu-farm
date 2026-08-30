import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { CattleForm } from "@/components/dairy/CattleForm";
import { updateCattleAction } from "@/lib/actions/cattle";
import { getCattleById, getCurrentUserRole } from "@/lib/data/cattle";
import { canManageCattle } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function EditCattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const role = await getCurrentUserRole();
  if (!canManageCattle(role)) redirect(`/dairy/${id}`);

  const cattle = await getCattleById(id);
  if (!cattle) notFound();

  const activeUserName = await getSessionUserName();
  const boundAction = updateCattleAction.bind(null, id);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">
          Edit {cattle.name ?? cattle.tagId}
        </h1>
        <CattleForm action={boundAction} initial={cattle} cancelHref={`/dairy/${id}`} />
      </main>
    </>
  );
}
