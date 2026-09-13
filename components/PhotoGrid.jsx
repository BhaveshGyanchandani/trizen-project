"use client";

import { useState } from "react";
import { idOf } from "@/lib/idOf";

function photoUrl(photo) {
  if (photo.storageUrl) return photo.storageUrl;
  if (photo.url) return photo.url;
  if (photo.secure_url) return photo.secure_url;
  const id = photo.id || photo._id;
  if (id) return `/api/photos/${id}/file`;
  return null;
}

export function PhotoGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-[var(--radius-proof)] bg-ink-soft" />
      ))}
    </div>
  );
}

function Thumbnail({ photo, tone }) {
  const [failed, setFailed] = useState(false);
  const src = photoUrl(photo);
  const dim = tone === "paper" ? "text-clay" : "text-ash";

  if (!src || failed) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center ${dim}`}>
        <span className="text-lg leading-none">·</span>
        <span className="font-mono text-[10px] leading-tight">Image unavailable</span>
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
  tone = "ink",
  locked = false,
  startIndex = 0,
  pendingIds,
}) {
  const frameBorder = tone === "paper" ? "border-paper-line" : "border-line";
  const frameBg = tone === "paper" ? "bg-paper-dim" : "bg-ink-soft";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo, index) => {
        const id = idOf(photo);
        const selected = locked ? true : selectedIds?.has(id);
        const pending = pendingIds?.has(id);
        const disabled = locked || pending;

        return (
          <figure
            key={id}
            className={`group relative aspect-square overflow-hidden rounded-[var(--radius-proof)] border ${frameBorder} ${frameBg} ${
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
              <Thumbnail photo={photo} tone={tone} />
            </button>

            <span className="frame-index pointer-events-none absolute left-1.5 top-1.5 rounded-sm bg-black/55 px-1 py-0.5 text-white">
              {String(startIndex + index + 1).padStart(3, "0")}
            </span>

            {locked && (
              <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-sm border border-develop bg-develop text-[11px] text-white">
                ✓
              </span>
            )}

            {selectable && !locked && (
              <span
                className={`pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-sm border text-[11px] ${
                  selected
                    ? "border-safelight bg-safelight text-white"
                    : "border-white/70 bg-black/40 text-transparent"
                }`}
              >
                ✓
              </span>
            )}

            {selectable && !locked && selected && (
              <span className="pointer-events-none absolute inset-0 border-2 border-safelight" />
            )}

            {locked && <span className="pointer-events-none absolute inset-0 border-2 border-develop/70" />}
          </figure>
        );
      })}
    </div>
  );
}
