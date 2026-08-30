"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { PhotoUploadField } from "@/components/ui/PhotoUploadField";
import { getFileUrl } from "@/lib/pb";
import type { Cattle } from "@/types/farm";

type ActionResult = { error?: string } | undefined;
type CattleAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

interface CattleFormProps {
  action: CattleAction;
  initial?: Partial<Cattle>;
  cancelHref: string;
}

const FIELD =
  "w-full text-sm px-3 py-2 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500";
const LABEL = "block text-[11px] uppercase tracking-wide text-ink-500 mb-1";

export function CattleForm({ action, initial, cancelHref }: CattleFormProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  return (
    <form action={formAction} encType="multipart/form-data" className="max-w-2xl space-y-6">
      {state?.error && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="tagId">Ear tag ID</label>
          <input id="tagId" name="tagId" required defaultValue={initial?.tagId} className={FIELD} />
        </div>
        <div>
          <label className={LABEL} htmlFor="name">Name (optional)</label>
          <input id="name" name="name" defaultValue={initial?.name} className={FIELD} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="category">Category</label>
          <select id="category" name="category" required defaultValue={initial?.category} className={FIELD}>
            <option value="">Select…</option>
            <option value="cow">Cow</option>
            <option value="heifer">Heifer</option>
            <option value="calf">Calf</option>
            <option value="bull">Bull</option>
            <option value="steer">Steer</option>
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="breed">Breed</label>
          <input id="breed" name="breed" required defaultValue={initial?.breed} className={FIELD} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="sex">Sex</label>
          <select id="sex" name="sex" required defaultValue={initial?.sex} className={FIELD}>
            <option value="">Select…</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="dob">Date of birth (optional)</label>
          <input id="dob" name="dob" type="date" defaultValue={initial?.dob} className={FIELD} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="status">Status</label>
          <select id="status" name="status" required defaultValue={initial?.status} className={FIELD}>
            <option value="">Select…</option>
            <option value="active">Active</option>
            <option value="dry">Dry</option>
            <option value="sold">Sold</option>
            <option value="deceased">Deceased</option>
            <option value="culled">Culled</option>
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="breedingStatus">Breeding status</label>
          <select
            id="breedingStatus"
            name="breedingStatus"
            required
            defaultValue={initial?.breedingStatus}
            className={FIELD}
          >
            <option value="">Select…</option>
            <option value="open">Open</option>
            <option value="served">Served</option>
            <option value="confirmed_pregnant">Confirmed pregnant</option>
            <option value="dry_off">Dry-off</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="acquisitionType">Acquisition type</label>
          <select
            id="acquisitionType"
            name="acquisitionType"
            required
            defaultValue={initial?.acquisitionType}
            className={FIELD}
          >
            <option value="">Select…</option>
            <option value="born_on_farm">Born on farm</option>
            <option value="purchased">Purchased</option>
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="acquisitionDate">Acquisition date</label>
          <input
            id="acquisitionDate"
            name="acquisitionDate"
            type="date"
            required
            defaultValue={initial?.acquisitionDate}
            className={FIELD}
          />
        </div>
      </div>

      <PhotoUploadField
        name="photoUrl"
        existingPhotoUrl={
          initial?.id && initial?.photoUrl ? getFileUrl("cattle", initial.id, initial.photoUrl) : undefined
        }
      />

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
