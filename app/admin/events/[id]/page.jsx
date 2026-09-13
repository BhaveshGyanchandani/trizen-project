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
import SummaryStrip from "@/components/SummaryStrip";
import Topbar from "@/components/Topbar";
import Field, { inputClass } from "@/components/Field";

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
  const [regenerating, setRegenerating] = useState(false);
  const [publishResult, setPublishResult] = useState(null); // { slug/url, pin, isFirstPublish } shown once
  const [pinResult, setPinResult] = useState(null); // { pin } from regenerate, shown once
  const [notFound, setNotFound] = useState(false);
  const [togglingIds, setTogglingIds] = useState(() => new Set());
  const [editOpen, setEditOpen] = useState(false);

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

  // Photos already live in a published gallery. These are locked: the
  // customer may already have seen or downloaded them, so they can't be
  // unchecked from here — only unpublish/republish changes them.
  const publishedPhotos = useMemo(
    () => (photos || []).filter((p) => p.publishedForGallery),
    [photos]
  );

  // Everything else: new uploads (or previously-unselected ones) that
  // still need an admin decision before the next publish.
  const pendingPhotos = useMemo(
    () => (photos || []).filter((p) => !p.publishedForGallery),
    [photos]
  );

  const selectedIds = useMemo(
    () => new Set(pendingPhotos.filter((p) => p.selectedForGallery).map(idOf)),
    [pendingPhotos]
  );

  // "Ready to publish" count = already-live photos (staying live) + newly
  // selected ones — this is what will actually be in the gallery after
  // the next publish.
  const totalReadyCount = publishedPhotos.length + selectedIds.size;

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
    // Ignore a second click on a photo whose request is still in flight —
    // this is what actually stops a rapid double-click from firing two
    // overlapping PATCH requests for the same photo.
    if (togglingIds.has(photoId)) return;

    const current = selectedIds.has(photoId);
    setTogglingIds((prev) => new Set(prev).add(photoId));
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
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await galleryAdminAPI.publish(id);
      const slug = result.slug || result.gallery?.slug;
      const pin = result.pin || result.gallery?.pin;
      const url = result.url || result.link || (slug ? `${window.location.origin}/gallery/${slug}` : "");
      // pin is only present on first publish; on republish the backend
      // omits it since it isn't changing and can't be re-shown.
      if (pin) {
        setPublishResult({ url, pin, isFirstPublish: true });
      } else {
        setPublishResult({ url, pin: null, isFirstPublish: false });
      }
      setGallery({ status: "published", slug });
      await load(); // refresh publishedForGallery flags on photos
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
      await load(); // clears publishedForGallery locks
    } catch (err) {
      toast.error(err.message || "Couldn't unpublish gallery.");
    }
  };

  const handleRegeneratePin = async () => {
    setRegenerating(true);
    try {
      const result = await galleryAdminAPI.regeneratePin(id);
      setPinResult({ pin: result.pin });
    } catch (err) {
      toast.error(err.message || "Couldn't regenerate PIN.");
    } finally {
      setRegenerating(false);
    }
  };

  if (notFound) {
    return (
      <div className="px-8 py-7">
        <EmptyState
          title="This event isn't available"
          description="It may belong to a different admin account, or the link is out of date."
        />
      </div>
    );
  }

  const unassigned = (allTeamMembers || []).filter((m) => !assignedIds.has(idOf(m)));
  const assigned = (allTeamMembers || []).filter((m) => assignedIds.has(idOf(m)));

  return (
    <div>
      <Topbar eyebrow={`EVENTS / ${(event?.name || "").toUpperCase()}`} title={event?.name || "Loading…"}>
        {event && (
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Edit event
          </Button>
        )}
      </Topbar>

      <div className="px-8 py-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[320px] flex-1">
            <SummaryStrip
              stats={[
                { label: "Total uploaded", value: photos?.length },
                { label: "Live in gallery", value: photos ? publishedPhotos.length : undefined },
                { label: "Awaiting review", value: photos ? pendingPhotos.length : undefined },
                { label: "Team assigned", value: event ? assigned.length : undefined },
              ]}
            />
          </div>
          <div className="w-[280px] shrink-0">
            <GalleryStatusPanel
              gallery={gallery}
              totalReadyCount={totalReadyCount}
              publishing={publishing}
              regenerating={regenerating}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onRegeneratePin={handleRegeneratePin}
            />
          </div>
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

      {photos === null && (
        <section className="mt-10">
          <h2 className="font-display text-xl">Photos</h2>
          <div className="mt-4">
            <PhotoGridSkeleton count={12} />
          </div>
        </section>
      )}

      {photos && photos.length === 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl">Photos</h2>
          <div className="mt-4">
            <EmptyState
              title="No photos uploaded yet"
              description="Once your team starts uploading, their photos will show up here for you to review and select."
            />
          </div>
        </section>
      )}

      {photos && photos.length > 0 && (
        <>
          {publishedPhotos.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Already published</h2>
                <span className="font-mono text-xs text-develop">
                  {publishedPhotos.length} live in gallery
                </span>
              </div>
              <p className="mt-1 text-sm text-ash">
                Already visible to the customer at this gallery link — locked here so nothing
                disappears from under them. Unpublish the gallery to make changes.
              </p>
              <div className="mt-4">
                <PhotoGrid photos={publishedPhotos} locked />
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">
                {publishedPhotos.length > 0 ? "New uploads" : "Photos"}
              </h2>
              <span className="font-mono text-xs text-ash">
                {selectedIds.size} of {pendingPhotos.length} selected
              </span>
            </div>
            {publishedPhotos.length > 0 && (
              <p className="mt-1 text-sm text-ash">
                Only these need a decision — select the ones to add to the live gallery.
              </p>
            )}
            <div className="mt-4">
              {pendingPhotos.length === 0 ? (
                <EmptyState
                  title="Nothing new to review"
                  description="Every uploaded photo is already published. New uploads from your team will show up here."
                />
              ) : (
                <PhotoGrid
                  photos={pendingPhotos}
                  selectable
                  selectedIds={selectedIds}
                  onToggle={handleTogglePhoto}
                  startIndex={publishedPhotos.length}
                  pendingIds={togglingIds}
                />
              )}
            </div>
          </section>
        </>
      )}
      </div>

      <PublishRevealModal result={publishResult} onClose={() => setPublishResult(null)} />
      <PinRevealModal result={pinResult} onClose={() => setPinResult(null)} />
      <EditEventModal
        open={editOpen}
        event={event}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setEvent(updated);
          setEditOpen(false);
          toast.success("Event updated.");
        }}
      />
    </div>
  );
}

function GalleryStatusPanel({
  gallery,
  totalReadyCount,
  publishing,
  regenerating,
  onPublish,
  onUnpublish,
  onRegeneratePin,
}) {
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
        <Button onClick={onPublish} disabled={publishing} className="mt-3 w-full">
          {publishing ? "Republishing…" : "Republish with new selections"}
        </Button>
        <Button
          variant="secondary"
          onClick={onRegeneratePin}
          disabled={regenerating}
          className="mt-2 w-full"
        >
          {regenerating ? "Regenerating…" : "Regenerate PIN"}
        </Button>
        <Button variant="danger" className="mt-2 w-full" onClick={onUnpublish}>
          Unpublish
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={onPublish} disabled={totalReadyCount === 0 || publishing}>
      {publishing ? "Publishing…" : "Publish gallery"}
    </Button>
  );
}

function PublishRevealModal({ result, onClose }) {
  const toast = useToast();

  if (result && !result.isFirstPublish) {
    // Republish: PIN unchanged, nothing new to reveal — just confirm.
    return (
      <Modal open={!!result} onClose={onClose} title="Gallery updated">
        <p className="text-sm text-ash">
          The live gallery now reflects your latest selections. The existing PIN still works —
          it doesn&apos;t change on republish.
        </p>
        <div className="mt-4">
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
        <Button className="mt-6 w-full" onClick={onClose}>
          Done
        </Button>
      </Modal>
    );
  }

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

function PinRevealModal({ result, onClose }) {
  const toast = useToast();
  return (
    <Modal open={!!result} onClose={onClose} title="PIN regenerated">
      <p className="text-sm text-ash">
        The old PIN no longer works. <span className="text-safelight">This new PIN won&apos;t be shown again</span> —
        copy it and send it to your customer.
      </p>
      <div className="mt-4">
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
      <Button className="mt-6 w-full" onClick={onClose}>
        Done
      </Button>
    </Modal>
  );
}

function EditEventModal({ open, event, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset the form to the event's current values every time the modal is
  // (re)opened, rather than once on mount — the modal instance is kept
  // alive across opens, so without this a previous edit's draft state
  // (or a stale name from before the parent's data loaded) would linger.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional form reset when the modal (re)opens
      setName(event?.name || "");
      setCoverFile(null);
      setPreviewUrl(null);
      setError("");
    }
  }, [open, event]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    setCoverFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Event name can't be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await eventsAPI.update(idOf(event), {
        name: name.trim(),
        coverPhotoFile: coverFile || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message || "Couldn't save changes.");
      toast.error(err.message || "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const currentCoverUrl = previewUrl || event?.coverPhotoUrl;

  return (
    <Modal open={open} onClose={onClose} title="Edit event">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-proof)] border border-line bg-ink-raised">
          {currentCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentCoverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-ash-dim">
              No photo
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="mb-1.5 text-xs font-medium text-ash">Cover photo</p>
          <label className="inline-block cursor-pointer rounded-[var(--radius-proof)] border border-line px-3 py-1.5 text-xs text-ash transition-colors hover:border-safelight hover:text-safelight">
            {coverFile ? coverFile.name : "Choose photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          <p className="mt-1.5 text-[11px] text-ash-dim">Shown on the events dashboard.</p>
        </div>
      </div>

      <div className="mt-5">
        <Field label="Event name" error={error}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass("ink", !!error)}
            placeholder="e.g. Arjun & Priya Wedding"
          />
        </Field>
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Modal>
  );
}
