"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import type { LandParcel } from "@/types/farm";

type ActionResult = { error?: string } | undefined;
type LandParcelAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

interface LandParcelFormProps {
  action: LandParcelAction;
  initial?: Partial<LandParcel>;
  cancelHref: string;
}

const FIELD =
  "w-full text-sm px-3 py-2 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500";
const LABEL = "block text-[11px] uppercase tracking-wide text-ink-500 mb-1";

export function LandParcelForm({ action, initial, cancelHref }: LandParcelFormProps) {
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
          <label className={LABEL} htmlFor="name">Plot name</label>
          <input id="name" name="name" required defaultValue={initial?.name} className={FIELD} placeholder="e.g. North Field" />
        </div>
        <div>
          <label className={LABEL} htmlFor="acreage">Acreage</label>
          <input
            id="acreage"
            name="acreage"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={initial?.acreage}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="currentUse">Current use</label>
        <select id="currentUse" name="currentUse" required defaultValue={initial?.currentUse} className={FIELD}>
          <option value="">Select…</option>
          <option value="crop">Crop</option>
          <option value="grazing">Grazing</option>
          <option value="fallow">Fallow</option>
          <option value="livestock_housing">Livestock housing</option>
          <option value="infrastructure">Infrastructure</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="soilType">Soil type (optional)</label>
          <select id="soilType" name="soilType" defaultValue={initial?.soilType ?? ""} className={FIELD}>
            <option value="">Unknown</option>
            <option value="loam">Loam</option>
            <option value="clay">Clay</option>
            <option value="sandy">Sandy</option>
            <option value="silt">Silt</option>
            <option value="volcanic">Volcanic</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="soilPH">Soil pH (optional)</label>
          <input id="soilPH" name="soilPH" type="number" min="0" max="14" step="0.1" defaultValue={initial?.soilPH} className={FIELD} />
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
