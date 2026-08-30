"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import type { SheepFlock } from "@/types/farm";

type ActionResult = { error?: string } | undefined;
type SheepFlockAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

interface SheepFlockFormProps {
  action: SheepFlockAction;
  initial?: Partial<SheepFlock>;
  cancelHref: string;
}

const FIELD =
  "w-full text-sm px-3 py-2 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500";
const LABEL = "block text-[11px] uppercase tracking-wide text-ink-500 mb-1";

/**
 * currentCount is deliberately NOT a form field — it's computed as
 * ramCount + eweCount + lambCount server-side (see
 * createSheepFlockAction/updateSheepFlockAction), rather than trusting a
 * separately-typed total that could drift out of sync with the
 * individual counts.
 */
export function SheepFlockForm({ action, initial, cancelHref }: SheepFlockFormProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state?.error && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="flockName">Flock name</label>
          <input id="flockName" name="flockName" required defaultValue={initial?.flockName} className={FIELD} />
        </div>
        <div>
          <label className={LABEL} htmlFor="breed">Breed</label>
          <input id="breed" name="breed" required defaultValue={initial?.breed} className={FIELD} />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="purpose">Purpose</label>
        <select id="purpose" name="purpose" required defaultValue={initial?.purpose} className={FIELD}>
          <option value="">Select…</option>
          <option value="wool">Wool</option>
          <option value="meat">Meat</option>
          <option value="dual_purpose">Dual purpose</option>
          <option value="breeding_stock">Breeding stock</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL} htmlFor="ramCount">Rams</label>
          <input id="ramCount" name="ramCount" type="number" min="0" required defaultValue={initial?.ramCount ?? 0} className={FIELD} />
        </div>
        <div>
          <label className={LABEL} htmlFor="eweCount">Ewes</label>
          <input id="eweCount" name="eweCount" type="number" min="0" required defaultValue={initial?.eweCount ?? 0} className={FIELD} />
        </div>
        <div>
          <label className={LABEL} htmlFor="lambCount">Lambs</label>
          <input id="lambCount" name="lambCount" type="number" min="0" required defaultValue={initial?.lambCount ?? 0} className={FIELD} />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={initial?.notes} className={FIELD} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
