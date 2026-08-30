"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";

type ActionResult = { error?: string } | undefined;
type CalvingAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

const FIELD =
  "w-full text-sm px-3 py-2 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500";
const LABEL = "block text-[11px] uppercase tracking-wide text-ink-500 mb-1";

/**
 * Collapsed behind a button by default rather than always-open — this is
 * a comparatively rare event (once per lactation, not routine like milk
 * logging) and doesn't need permanent screen real estate on every female
 * cow's page. Submitting creates the calving_records row AND
 * auto-starts a lactation_cycles row server-side (see
 * createCalvingRecord in lib/data/dairy-records.ts) — that's the actual
 * fix for the "no way to show a cow is lactating" gap, not just this
 * form existing.
 */
export function CalvingForm({ action }: { action: CalvingAction }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Log calving
      </Button>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4 border border-line rounded p-5 bg-parchment-100/40">
      <h3 className="font-display text-base text-ink-900">Log calving</h3>

      {state?.error && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded px-3 py-2">{state.error}</p>
      )}

      <div>
        <label className={LABEL} htmlFor="calvingDate">Calving date</label>
        <input
          id="calvingDate"
          name="calvingDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="outcome">Outcome</label>
        <select id="outcome" name="outcome" required className={FIELD} defaultValue="live_birth">
          <option value="live_birth">Live birth</option>
          <option value="stillbirth">Stillbirth</option>
          <option value="aborted">Aborted</option>
        </select>
        <p className="text-xs text-ink-500 mt-1">
          Live birth and stillbirth both start a new lactation cycle for this cow — a stillbirth still triggers
          milk let-down at term. Aborted does not.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor="calfSex">Calf sex (optional)</label>
        <select id="calfSex" name="calfSex" className={FIELD} defaultValue="">
          <option value="">Unknown / not applicable</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor="complications">Complications (optional)</label>
        <textarea id="complications" name="complications" rows={2} className={FIELD} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save calving record"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
