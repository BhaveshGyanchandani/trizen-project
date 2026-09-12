import { idOf } from "@/lib/idOf";

function photoUrl(photo) {
  // gridfsId takes priority: once a photo is stored in GridFS it has to be
  // streamed through /api/photos/[id]/file (no static path exists for it),
  // whereas storageUrl/url/secure_url are all directly loadable as-is.
  if (photo.gridfsId) return `/api/photos/${photo.id ?? photo._id}/file`;
  return photo.storageUrl || photo.url || photo.secure_url;
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

export default function PhotoGrid({
  photos,
  selectable = false,
  selectedIds,
  onToggle,
  onPhotoClick,
  tone = "ink",
}) {
  const frameBorder = tone === "paper" ? "border-paper-line" : "border-line";
  const frameBg = tone === "paper" ? "bg-paper-dim" : "bg-ink-soft";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo, index) => {
        const id = idOf(photo);
        const selected = selectedIds?.has(id);
        return (
          <figure
            key={id}
            className={`group relative aspect-square overflow-hidden rounded-[var(--radius-proof)] border ${frameBorder} ${frameBg}`}
          >
            <button
              type="button"
              onClick={() => (selectable ? onToggle?.(id) : onPhotoClick?.(index))}
              className="absolute inset-0 h-full w-full"
              aria-label={selectable ? `Toggle ${photo.filename}` : `View ${photo.filename}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(photo)}
                alt={photo.filename || "Event photo"}
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-200 ${
                  onPhotoClick ? "group-hover:scale-[1.03]" : ""
                }`}
              />
            </button>

            <span className="frame-index pointer-events-none absolute left-1.5 top-1.5 rounded-sm bg-black/55 px-1 py-0.5 text-white">
              {String(index + 1).padStart(3, "0")}
            </span>

            {selectable && (
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

            {selectable && selected && (
              <span className="pointer-events-none absolute inset-0 border-2 border-safelight" />
            )}
          </figure>
        );
      })}
    </div>
  );
}
