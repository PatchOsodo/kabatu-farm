"use client";

import { useMemo, useState, useTransition } from "react";
import type { Enterprise, Task, TaskPriority, TaskStatus } from "@/types/farm";
import { createTaskAction, updateTaskStatusAction } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/Button";

const ENTERPRISE_FILTERS: Array<Enterprise | "all"> = ["all", "dairy", "sheep", "poultry", "crops"];
const COLUMNS: Array<{ key: TaskStatus; label: string }> = [
  { key: "pending", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const PRIORITY_TONE: Record<TaskPriority, string> = {
  low: "text-ink-500 border-ink-300/40 bg-ink-300/5",
  medium: "text-gold-600 border-gold-500/40 bg-gold-500/10",
  high: "text-clay-600 border-clay-600/30 bg-clay-600/5",
  urgent: "text-danger border-danger/30 bg-danger/5",
};

function isOverdue(task: Task) {
  return task.status !== "completed" && task.status !== "cancelled" && task.dueDate < new Date().toISOString().slice(0, 10);
}

interface TaskBoardProps {
  tasks: Task[];
  canCreate: boolean;
  canUpdateStatus: boolean;
}

export function TaskBoard({ tasks: initialTasks, canCreate, canUpdateStatus }: TaskBoardProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TaskStatus>>({});
  const [enterprise, setEnterprise] = useState<Enterprise | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [newEnterprise, setNewEnterprise] = useState<Enterprise>("dairy");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const tasks = useMemo(() => {
    const merged = [...localTasks, ...initialTasks];
    return merged.map((t) => (statusOverrides[t.id] ? { ...t, status: statusOverrides[t.id] } : t));
  }, [localTasks, initialTasks, statusOverrides]);

  const filtered = useMemo(
    () => tasks.filter((t) => enterprise === "all" || t.enterprise === enterprise),
    [tasks, enterprise]
  );

  function addTask() {
    if (!title.trim()) return;
    setError(null);

    const optimistic: Task = {
      id: `local-${Date.now()}`,
      title: title.trim(),
      enterprise: newEnterprise,
      dueDate,
      status: "pending",
      priority,
      recurrence: "none",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalTasks((prev) => [optimistic, ...prev]);
    setTitle("");

    startTransition(async () => {
      const result = await createTaskAction({ title: optimistic.title, enterprise: newEnterprise, dueDate, priority });
      if (!result.ok) {
        setError(result.error);
        setLocalTasks((prev) => prev.filter((t) => t.id !== optimistic.id));
      }
    });
  }

  function advance(taskId: string, current: TaskStatus) {
    const next: TaskStatus = current === "pending" ? "in_progress" : "completed";
    const previous = statusOverrides[taskId] ?? current;
    setStatusOverrides((prev) => ({ ...prev, [taskId]: next }));
    setError(null);

    // Locally-created tasks not yet confirmed by the server don't have a
    // real id to update against — skip the network call for those; the
    // optimistic local state already reflects the change.
    if (taskId.startsWith("local-")) return;

    startTransition(async () => {
      const result = await updateTaskStatusAction(taskId, next);
      if (!result.ok) {
        setError(result.error);
        setStatusOverrides((prev) => ({ ...prev, [taskId]: previous }));
      }
    });
  }

  return (
    <div>
      {canCreate && (
        <section className="border border-line rounded p-5 mb-6 bg-parchment-100/40">
          <h2 className="font-display text-lg text-ink-900 mb-4">Add a task</h2>
          {error && <p className="text-sm text-danger mb-3">{error}</p>}
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Vaccinate broiler batch"
                className={`${inputCls} w-64`}
              />
            </Field>
            <Field label="Enterprise">
              <select value={newEnterprise} onChange={(e) => setNewEnterprise(e.target.value as Enterprise)} className={inputCls}>
                <option value="dairy">Dairy</option>
                <option value="sheep">Sheep</option>
                <option value="poultry">Poultry</option>
                <option value="crops">Crops</option>
              </select>
            </Field>
            <Field label="Due date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
            <Button onClick={addTask} variant="primary">
              Add task
            </Button>
          </div>
        </section>
      )}

      <div className="flex gap-1 mb-4">
        {ENTERPRISE_FILTERS.map((e) => (
          <button
            key={e}
            onClick={() => setEnterprise(e)}
            className={[
              "text-xs px-2.5 py-1 rounded-full border capitalize transition-colors",
              enterprise === e
                ? "bg-forest-900 text-parchment-50 border-forest-900"
                : "border-line text-ink-500 hover:border-ink-300",
            ].join(" ")}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="bg-parchment-100/40 border border-line rounded p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs uppercase tracking-wide text-ink-500 font-medium">{col.label}</h3>
                <span className="text-xs font-mono-data text-ink-500">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map((t) => {
                  const overdue = isOverdue(t);
                  return (
                    <div
                      key={t.id}
                      className={[
                        "bg-white rounded border p-3 text-sm",
                        overdue ? "border-danger/40" : "border-line",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-ink-900 leading-snug">{t.title}</p>
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-mono-data capitalize ${PRIORITY_TONE[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono-data ${overdue ? "text-danger" : "text-ink-500"}`}>
                          {overdue ? "Overdue · " : ""}
                          {t.dueDate}
                        </span>
                        {col.key !== "completed" && canUpdateStatus && (
                          <Button onClick={() => advance(t.id, t.status)} variant="ghost" size="sm">
                            {col.key === "pending" ? "Start →" : "Complete ✓"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && <p className="text-xs text-ink-300 px-1 py-4 text-center">Nothing here</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputCls = "text-sm px-2.5 py-1.5 rounded border border-line bg-white focus:outline-none focus:border-gold-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-500">
      {label}
      {children}
    </label>
  );
}
