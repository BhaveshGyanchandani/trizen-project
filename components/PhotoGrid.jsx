"use client";

import { useState } from "react";
import { Check, ImageOff } from "lucide-react";
import { idOf } from "@/lib/idOf";
import { Skeleton } from "@/components/ui/skeleton";

function photoUrl(photo) {
  // Always resolve through the GridFS-backed API route first — it's the
  // only storage backend a Photo can point at, and it's what enforces
  // per-photo access rules (owner/team/published-gallery). storageUrl is
  // a legacy local-disk field that doesn't survive a serverless deploy;
  // url/secure_url are kept as a last resort for any hand-shaped test data.
  const id = photo.id || photo._id;
  if (id) return `/api/photos/${id}/file`;
  if (photo.storageUrl) return photo.storageUrl;
  if (photo.url) return photo.url;
  if (photo.secure_url) return photo.secure_url;
  return null;
}

export function PhotoGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

function Thumbnail({ photo }) {
  const [failed, setFailed] = useState(false);
  const src = photoUrl(photo);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center text-muted-foreground">
        <ImageOff className="size-4" />
        <span className="text-[10px] leading-tight">Image unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={photo.filename || "Event photo"}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
    />
  );
}

export default function PhotoGrid({
  photos,
  selectable = false,
  selectedIds,
  onToggle,
  onPhotoClick,
  locked = false,
  startIndex = 0,
  pendingIds,
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo, index) => {
        const id = idOf(photo);
        const selected = locked ? true : selectedIds?.has(id);
        const pending = pendingIds?.has(id);
        const disabled = locked || pending;

        return (
          <figure
            key={id}
            className={`group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted ${
              locked ? "opacity-90" : ""
            } ${pending ? "opacity-60" : ""}`}
          >
            <button
              type="button"
              onClick={() => (disabled ? undefined : selectable ? onToggle?.(id) : onPhotoClick?.(index))}
              className={`absolute inset-0 h-full w-full ${disabled ? "cursor-default" : ""}`}
              aria-label={
                locked
                  ? `${photo.filename} — already published`
                  : pending
                    ? `${photo.filename} — updating`
                    : selectable
                      ? `Toggle ${photo.filename}`
                      : `View ${photo.filename}`
              }
              aria-busy={pending || undefined}
              disabled={disabled}
            >
              <Thumbnail photo={photo} />
            </button>

            <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
              {String(startIndex + index + 1).padStart(3, "0")}
            </span>

            {locked && (
              <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-success bg-success text-white">
                <Check className="size-3" />
              </span>
            )}

            {selectable && !locked && (
              <span
                className={`pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/70 bg-black/40 text-transparent"
                }`}
              >
                <Check className="size-3" />
              </span>
            )}

            {selectable && !locked && selected && (
              <span className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary" />
            )}

            {locked && <span className="pointer-events-none absolute inset-0 rounded-lg border-2 border-success/70" />}
          </figure>
        );
      })}
    </div>
  );
}
