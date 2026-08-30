"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import type { PoultryFlock } from "@/types/farm";

type ActionResult = { error?: string } | undefined;
type PoultryFlockAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

interface PoultryFlockFormProps {
  action: PoultryFlockAction;
  initial?: Partial<PoultryFlock>;
  cancelHref: string;
}

const FIELD =
  "w-full text-sm px-3 py-2 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500";
const LABEL = "block text-[11px] uppercase tracking-wide text-ink-500 mb-1";

export function PoultryFlockForm({ action, initial, cancelHref }: PoultryFlockFormProps) {
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="type">Type</label>
          <select id="type" name="type" required defaultValue={initial?.type} className={FIELD}>
            <option value="">Select…</option>
            <option value="layers">Layers</option>
            <option value="broilers">Broilers</option>
            <option value="kienyeji">Kienyeji</option>
            <option value="breeders">Breeders</option>
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="housingLocation">Housing location</label>
          <input id="housingLocation" name="housingLocation" required defaultValue={initial?.housingLocation} className={FIELD} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="currentBirdCount">Current bird count</label>
          <input
            id="currentBirdCount"
            name="currentBirdCount"
            type="number"
            min="0"
            required
            defaultValue={initial?.currentBirdCount ?? 0}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="status">Status</label>
          <select id="status" name="status" required defaultValue={initial?.status ?? "active"} className={FIELD}>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            <option value="sold_out">Sold out</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="dateAcquired">Date acquired</label>
          <input id="dateAcquired" name="dateAcquired" type="date" required defaultValue={initial?.dateAcquired} className={FIELD} />
        </div>
        <div>
          <label className={LABEL} htmlFor="sourceType">Source</label>
          <select id="sourceType" name="sourceType" required defaultValue={initial?.sourceType} className={FIELD}>
            <option value="">Select…</option>
            <option value="hatched_on_farm">Hatched on farm</option>
            <option value="purchased_chicks">Purchased chicks</option>
            <option value="purchased_point_of_lay">Purchased point-of-lay</option>
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="ageWeeksAtAcquisition">Age at acquisition, in weeks (optional)</label>
        <input
          id="ageWeeksAtAcquisition"
          name="ageWeeksAtAcquisition"
          type="number"
          min="0"
          defaultValue={initial?.ageWeeksAtAcquisition}
          className={FIELD}
        />
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
