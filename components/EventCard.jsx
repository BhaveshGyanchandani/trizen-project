import Link from "next/link";
import Badge from "./Badge";
import { idOf } from "@/lib/idOf";

export default function EventCard({ event, href }) {
  const photoCount = event.photoCount ?? event.photos?.length;
  const teamCount = event.teamMembers?.length ?? event.teamMemberCount;
  const galleryStatus = event.gallery?.status ?? event.galleryStatus;

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 border-b border-line px-1 py-5 transition-colors last:border-b-0 hover:bg-ink-soft"
    >
      <div className="min-w-0">
        <p className="truncate font-display text-lg">{event.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ash">
          {photoCount !== undefined && <span>{photoCount} photos</span>}
          {teamCount !== undefined && <span>{teamCount} team</span>}
          {event.createdAt && (
            <span>{new Date(event.createdAt).toLocaleDateString()}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {galleryStatus && (
          <Badge tone={galleryStatus === "published" ? "published" : "draft"}>
            {galleryStatus}
          </Badge>
        )}
        <span className="text-sm text-ash transition-colors group-hover:text-bone">
          Open
        </span>
      </div>
    </Link>
  );
}

export function eventId(event) {
  return idOf(event);
}
