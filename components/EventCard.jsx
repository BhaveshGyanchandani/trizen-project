import Link from "next/link";
import Badge from "./Badge";
import { idOf } from "@/lib/idOf";

/** Renders an event's cover photo, or a quiet placeholder frame when none is set. */
function Thumb({ event }) {
  const src = event.coverPhotoUrl;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />;
  }
  // No cover photo available yet — a quiet frame placeholder, not a broken image.
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
      ·
    </div>
  );
}

/**
 * Compact row summarizing one event in a list: thumbnail, name, photo
 * and team counts, creation date, and gallery status badge. Links to
 * `href` (typically the event's detail page). Accepts either the
 * flattened API shape or a couple of legacy nested shapes for the
 * count/status fields.
 */
export default function EventCard({ event, href }) {
  const photoCount = event.photoCount ?? event.photos?.length;
  const teamCount = event.teamMembers?.length ?? event.teamMemberCount;
  const galleryStatus = event.gallery?.status ?? event.galleryStatus;

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/60"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <Thumb event={event} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{event.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {photoCount !== undefined && <span>{photoCount} photos</span>}
            {teamCount !== undefined && <span>{teamCount} team</span>}
            {event.createdAt && <span>{new Date(event.createdAt).toLocaleDateString()}</span>}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {galleryStatus && (
          <Badge tone={galleryStatus === "published" ? "published" : "draft"}>{galleryStatus}</Badge>
        )}
        <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">→</span>
      </div>
    </Link>
  );
}

/** Extracts a normalized id from an event object (see lib/idOf.js). */
export function eventId(event) {
  return idOf(event);
}
