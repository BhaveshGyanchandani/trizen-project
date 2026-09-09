"use client";

import { use, useEffect, useMemo, useState } from "react";
import { eventsAPI, teamMembersAPI, photosAPI, galleryAdminAPI } from "@/lib/api";
import { idOf } from "@/lib/idOf";
import { useToast } from "@/lib/useToast";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";
import PhotoGrid, { PhotoGridSkeleton } from "@/components/PhotoGrid";

function normalizeGallery(data) {
  if (!data) return { status: "draft" };
  const g = data.gallery || data;
  return {
    status: g.status || "draft",
    slug: g.slug,
  };
}

export default function AdminEventDetail({ params }) {
  const { id } = use(params);
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [allTeamMembers, setAllTeamMembers] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [gallery, setGallery] = useState({ status: "draft" });
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null); // { slug/url, pin } shown once
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    try {
      const [eventData, membersData, photosData] = await Promise.all([
        eventsAPI.getById(id),
        teamMembersAPI.list(),
        photosAPI.listAllForEvent(id),
      ]);
      setEvent(eventData);
      setAllTeamMembers(Array.isArray(membersData) ? membersData : membersData?.teamMembers || []);
      setPhotos(Array.isArray(photosData) ? photosData : photosData?.photos || []);
    } catch (err) {
      if (err.status === 403 || err.status === 404) setNotFound(true);
      else toast.error(err.message || "Couldn't load this event.");
    }
    try {
      const galleryData = await galleryAdminAPI.getStatus(id);
      setGallery(normalizeGallery(galleryData));
    } catch {
      setGallery({ status: "draft" });
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignedIds = useMemo(
    () => new Set((event?.teamMembers || []).map((m) => (typeof m === "string" ? m : idOf(m)))),
    [event]
  );

  const selectedIds = useMemo(
    () => new Set((photos || []).filter((p) => p.selectedForGallery).map(idOf)),
    [photos]
  );

  const handleAssign = async (userId) => {
    try {
      await eventsAPI.addTeamMember(id, userId);
      setEvent((prev) => ({
        ...prev,
        teamMembers: [...(prev.teamMembers || []), userId],
      }));
    } catch (err) {
      toast.error(err.message || "Couldn't assign team member.");
    }
  };

  const handleTogglePhoto = async (photoId) => {
    const current = selectedIds.has(photoId);
    setPhotos((prev) =>
      prev.map((p) => (idOf(p) === photoId ? { ...p, selectedForGallery: !current } : p))
    );
    try {
      await photosAPI.toggleSelect(photoId, !current);
    } catch (err) {
      // roll back on failure
      setPhotos((prev) =>
        prev.map((p) => (idOf(p) === photoId ? { ...p, selectedForGallery: current } : p))
      );
      toast.error(err.message || "Couldn't update selection.");
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await galleryAdminAPI.publish(id);
      const slug = result.slug || result.gallery?.slug;
      const pin = result.pin || result.gallery?.pin;
      const url = result.url || result.link || (slug ? `${window.location.origin}/gallery/${slug}` : "");
      setPublishResult({ url, pin });
      setGallery({ status: "published", slug });
    } catch (err) {
      toast.error(err.message || "Couldn't publish gallery.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      await galleryAdminAPI.unpublish(id);
      setGallery({ status: "draft" });
      toast.show("Gallery unpublished. Photos are no longer visible to the customer.");
    } catch (err) {
      toast.error(err.message || "Couldn't unpublish gallery.");
    }
  };

  if (notFound) {
    return (
      <EmptyState
        title="This event isn't available"
        description="It may belong to a different admin account, or the link is out of date."
      />
    );
  }

  const unassigned = (allTeamMembers || []).filter((m) => !assignedIds.has(idOf(m)));
  const assigned = (allTeamMembers || []).filter((m) => assignedIds.has(idOf(m)));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{event?.name || "Loading…"}</h1>
          <p className="mt-1 text-sm text-ash">
            {photos ? `${photos.length} photos uploaded` : "Loading photos…"}
          </p>
        </div>
        <GalleryStatusPanel
          gallery={gallery}
          selectedCount={selectedIds.size}
          publishing={publishing}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl">Team on this event</h2>
        <p className="mt-1 text-sm text-ash">
          Assigning gives someone upload access. Assignments can&apos;t be removed here.
        </p>
        {allTeamMembers === null ? (
          <div className="mt-4">
            <Loader label="Loading team" />
          </div>
        ) : allTeamMembers.length === 0 ? (
          <p className="mt-4 text-sm text-ash">
            You haven&apos;t added any team members yet — do that from the Team page first.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {assigned.map((m) => (
              <Badge key={idOf(m)} tone="published">
                {m.name}
              </Badge>
            ))}
            {unassigned.map((m) => (
              <button
                key={idOf(m)}
                onClick={() => handleAssign(idOf(m))}
                className="rounded-[var(--radius-proof)] border border-line px-2.5 py-1 font-mono text-[11px] text-ash transition-colors hover:border-safelight hover:text-safelight"
              >
                + {m.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Photos</h2>
          <span className="font-mono text-xs text-ash">
            {selectedIds.size} of {photos?.length ?? 0} selected
          </span>
        </div>
        <div className="mt-4">
          {photos === null && <PhotoGridSkeleton count={12} />}
          {photos?.length === 0 && (
            <EmptyState
              title="No photos uploaded yet"
              description="Once your team starts uploading, their photos will show up here for you to review and select."
            />
          )}
          {photos && photos.length > 0 && (
            <PhotoGrid
              photos={photos}
              selectable
              selectedIds={selectedIds}
              onToggle={handleTogglePhoto}
            />
          )}
        </div>
      </section>

      <PublishRevealModal
        result={publishResult}
        onClose={() => setPublishResult(null)}
      />
    </div>
  );
}

function GalleryStatusPanel({ gallery, selectedCount, publishing, onPublish, onUnpublish }) {
  if (gallery.status === "published") {
    const url = gallery.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/gallery/${gallery.slug}` : "";
    return (
      <div className="rounded-[var(--radius-proof)] border border-develop/40 bg-develop-tint/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge tone="published">Published</Badge>
        </div>
        {url && (
          <p className="mt-2 max-w-[220px] truncate font-mono text-xs text-ash" title={url}>
            {url}
          </p>
        )}
        <Button variant="danger" className="mt-3 w-full" onClick={onUnpublish}>
          Unpublish
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={onPublish} disabled={selectedCount === 0 || publishing}>
      {publishing ? "Publishing…" : "Publish gallery"}
    </Button>
  );
}

function PublishRevealModal({ result, onClose }) {
  const toast = useToast();
  return (
    <Modal open={!!result} onClose={onClose} title="Gallery published">
      <p className="text-sm text-ash">
        Share this link and PIN with your customer. <span className="text-safelight">The PIN won&apos;t be shown again</span> —
        copy it now.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1 text-xs text-ash">Gallery link</p>
          <div className="flex items-center justify-between rounded-[var(--radius-proof)] border border-line bg-ink-soft px-3 py-2">
            <span className="truncate font-mono text-sm">{result?.url}</span>
            <button
              className="ml-3 shrink-0 text-xs text-safelight hover:underline"
              onClick={() => navigator.clipboard.writeText(result?.url || "").then(() => toast.show("Link copied."))}
            >
              Copy
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-ash">Access PIN</p>
          <div className="flex items-center justify-between rounded-[var(--radius-proof)] border border-line bg-ink-soft px-3 py-2">
            <span className="font-mono text-lg tracking-[0.3em]">{result?.pin}</span>
            <button
              className="ml-3 shrink-0 text-xs text-safelight hover:underline"
              onClick={() => navigator.clipboard.writeText(result?.pin || "").then(() => toast.show("PIN copied."))}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={onClose}>
        Done
      </Button>
    </Modal>
  );
}
