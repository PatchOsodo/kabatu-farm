"use server";

import { revalidatePath } from "next/cache";
import { createTask, getCurrentUserRole, updateTaskStatus, type TaskInput } from "@/lib/data/tasks";
import { canCreateTask, canUpdateTaskStatus } from "@/lib/authz";
import type { TaskStatus } from "@/types/farm";

export async function createTaskAction(input: TaskInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getCurrentUserRole();
  if (!canCreateTask(role)) {
    return { ok: false, error: "You don't have permission to create tasks." };
  }
  if (!input.title.trim() || !input.dueDate) {
    return { ok: false, error: "Enter a title and due date." };
  }

  try {
    await createTask({ ...input, title: input.title.trim() });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save this task." };
  }

  revalidatePath("/tasks");
  return { ok: true };
}

/**
 * advance() in TaskBoard only ever moves pending -> in_progress ->
 * completed, but accepting the target status explicitly (rather than
 * re-deriving "next" server-side) keeps this action correct if the UI
 * ever adds a "reopen" or "cancel" action later.
 */
export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getCurrentUserRole();
  if (!canUpdateTaskStatus(role)) {
    return { ok: false, error: "You don't have permission to update tasks." };
  }

  try {
    await updateTaskStatus(taskId, status);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not update this task." };
  }

  revalidatePath("/tasks");
  return { ok: true };
}
