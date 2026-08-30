"use client";

import { useState, type ChangeEvent } from "react";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — must match pb_migrations' FileField maxSize
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const LABEL = "block text-[11px] uppercase tracking-wide text-ink-500 mb-1";

interface PhotoUploadFieldProps {
  /** The form field name PocketBase expects — "photoUrl" for cattle, "photo" for sheep/poultry flocks. */
  name: string;
  label?: string;
  /** Existing photo URL to preview, if editing a record that already has one. */
  existingPhotoUrl?: string;
}

/**
 * A single <input type="file"> plus a live preview (either the newly
 * chosen file or, on first render, the record's existing photo). Client-
 * side mimetype/size checks are just a friendlier UX pass — the real
 * enforcement is the PocketBase FileField validator itself
 * (pb_migrations/019_photo_upload_fields.js / 003_cattle_collection.js),
 * confirmed against a real server to reject bad uploads with a proper
 * validation_invalid_mime_type error.
 */
export function PhotoUploadField({ name, label = "Photo", existingPhotoUrl }: PhotoUploadFieldProps) {
  const [preview, setPreview] = useState<string | undefined>(existingPhotoUrl);
  const [clientError, setClientError] = useState<string | undefined>();

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setClientError(undefined);
    if (!file) {
      setPreview(existingPhotoUrl);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setClientError("Please choose a JPEG, PNG, or WebP image.");
      e.target.value = "";
      setPreview(existingPhotoUrl);
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError("That image is over 5MB — please choose a smaller one.");
      e.target.value = "";
      setPreview(existingPhotoUrl);
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div>
      <label className={LABEL} htmlFor={name}>{label} (optional)</label>
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview can be a local blob: URL, next/image can't handle that
          <img
            src={preview}
            alt=""
            className="w-16 h-16 rounded object-cover border border-line shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded border border-dashed border-line shrink-0 flex items-center justify-center text-[10px] text-ink-500 text-center px-1">
            No photo
          </div>
        )}
        <input
          id={name}
          name={name}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleChange}
          className="text-sm text-ink-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-line file:bg-parchment-50 file:text-xs file:uppercase file:tracking-wide hover:file:border-ink-300"
        />
      </div>
      {clientError && <p className="text-xs text-danger mt-1">{clientError}</p>}
    </div>
  );
}
