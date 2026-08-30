"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { LactationStage } from "@/types/farm";

type ActionResult = { ok: boolean; error?: string } | undefined;
type StageAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

const STAGES: LactationStage[] = ["early", "mid", "late", "dry"];

export function LactationStageControl({ action, currentStage }: { action: StageAction; currentStage: LactationStage }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  if (currentStage === "dry") {
    return null; // already closed out — nothing to update
  }

  return (
    <form action={formAction} className="flex items-center gap-2 mt-3">
      <select
        name="stage"
        defaultValue={currentStage}
        className="text-xs px-2 py-1 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500"
      >
        {STAGES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Update stage"}
      </Button>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
