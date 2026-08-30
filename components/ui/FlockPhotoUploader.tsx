"use client";

import { useActionState } from "react";
import { PhotoUploadField } from "@/components/ui/PhotoUploadField";
import { Button } from "@/components/ui/Button";

type ActionResult = { ok: boolean; error?: string } | undefined;
type PhotoAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

interface FlockPhotoUploaderProps {
  action: PhotoAction;
  existingPhotoUrl?: string;
}

/**
 * A minimal standalone "upload/replace photo" form for a sheep or poultry
 * flock detail page. Deliberately NOT part of a bigger flock edit form —
 * there isn't one (confirmed: no create/edit route exists for either
 * sheep_flocks or poultry_flocks anywhere in the app). Building full flock
 * CRUD is a separate, larger gap — this only covers the photo, per scope.
 */
export function FlockPhotoUploader({ action, existingPhotoUrl }: FlockPhotoUploaderProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex items-start gap-4">
      <PhotoUploadField name="photo" label="" existingPhotoUrl={existingPhotoUrl} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending} className="mt-5">
        {pending ? "Uploading…" : "Save photo"}
      </Button>
      {state?.error && <p className="text-xs text-danger mt-6">{state.error}</p>}
    </form>
  );
}
