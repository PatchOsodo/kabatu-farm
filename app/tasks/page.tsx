import { Topbar } from "@/components/layout/Topbar";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { getTasks, getCurrentUserRole } from "@/lib/data/tasks";
import { canCreateTask, canUpdateTaskStatus } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function TasksPage() {
  const [tasks, role, activeUserName] = await Promise.all([getTasks(), getCurrentUserRole(), getSessionUserName()]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <TaskBoard tasks={tasks} canCreate={canCreateTask(role)} canUpdateStatus={canUpdateTaskStatus(role)} />
      </main>
    </>
  );
}
