import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { Enterprise, Task, TaskPriority, TaskStatus, UserRole } from "@/types/farm";

/** Server-side helper — builds a PocketBase client hydrated from the request's auth cookie. */
async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

// See lib/data/dairy-records.ts's toISODate — PocketBase's full-timestamp
// date storage vs. the plain YYYY-MM-DD the ISODate type promises.
function toISODate(value: string | undefined | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function mapTask(record: Record<string, unknown>): Task {
  return {
    id: record.id as string,
    title: record.title as string,
    description: (record.description as string) || undefined,
    enterprise: record.enterprise as Enterprise,
    relatedEntityId: (record.relatedEntityId as string) || undefined,
    assignedTo: (record.assignedTo as string) || undefined,
    dueDate: toISODate(record.dueDate as string) as string,
    status: record.status as TaskStatus,
    priority: record.priority as TaskPriority,
    recurrence: (record.recurrence as Task["recurrence"]) || undefined,
    completedAt: (record.completedAt as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

export async function getTasks(): Promise<Task[]> {
  const pb = await getServerPb();
  const records = await pb.collection("tasks").getFullList({ sort: "dueDate" });
  return records.map(mapTask);
}

export type TaskInput = {
  title: string;
  enterprise: Enterprise;
  dueDate: string;
  priority: TaskPriority;
};

export async function createTask(input: TaskInput): Promise<Task> {
  const pb = await getServerPb();
  const record = await pb.collection("tasks").create({
    ...input,
    status: "pending",
    recurrence: "none",
  });
  return mapTask(record);
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const pb = await getServerPb();
  const record = await pb.collection("tasks").update(id, {
    status,
    completedAt: status === "completed" ? new Date().toISOString() : null,
  });
  return mapTask(record);
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}
