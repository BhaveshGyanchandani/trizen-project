"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
import { eventsAPI, teamMembersAPI, photosAPI, galleryAdminAPI, photoRequestsAPI, photoFeedbackAPI } from "@/lib/api";
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
import { Card, CardContent } from "@/components/ui/card";

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
  const [photoSummary, setPhotoSummary] = useState(null);
  const [photoFilters, setPhotoFilters] = useState({ status: "all", uploadedBy: "all" });
  const [photoLoading, setPhotoLoading] = useState(false);
  const [customerRequests, setCustomerRequests] = useState(null);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [photoFeedback, setPhotoFeedback] = useState([]);
  const [gallery, setGallery] = useState({ status: "draft" });
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [publishResult, setPublishResult] = useState(null); // { slug/url, pin, isFirstPublish } shown once
  const [pinResult, setPinResult] = useState(null); // { pin } from regenerate, shown once
  const [notFound, setNotFound] = useState(false);
  const [togglingIds, setTogglingIds] = useState(() => new Set());
  const [updatingAssignmentIds, setUpdatingAssignmentIds] = useState(() => new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const load = async () => {
    setPhotoLoading(true);
    try {
      const [eventData, membersData, photosData] = await Promise.all([
        eventsAPI.getById(id),
        teamMembersAPI.list(),
        photosAPI.listAllForEvent(id, photoFilters),
      ]);
      setEvent(eventData);
      setAllTeamMembers(Array.isArray(membersData) ? membersData : membersData?.teamMembers || []);
      setPhotos(Array.isArray(photosData) ? photosData : photosData?.photos || []);
      setPhotoSummary(photosData?.summary || null);
    } catch (err) {
      if (err.status === 403 || err.status === 404) setNotFound(true);
      else toast.error(err.message || "Couldn't load this event.");
    } finally {
      setPhotoLoading(false);
    }
    try {
      const galleryData = await galleryAdminAPI.getStatus(id);
      setGallery(normalizeGallery(galleryData));
    } catch {
      setGallery({ status: "draft" });
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const data = await photoRequestsAPI.listForEvent(id, "all");
      setCustomerRequests(data?.requests || []);
    } catch (err) {
      toast.error(err.message || "Couldn't load customer requests.");
      setCustomerRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      const data = await photoFeedbackAPI.listForEvent(id);
      setPhotoFeedback(data?.feedback || []);
    } catch (err) {
      toast.error(err.message || "Couldn't load photo ratings.");
      setPhotoFeedback([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
    loadRequests();
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, photoFilters.status, photoFilters.uploadedBy]);

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

  const feedbackByPhoto = useMemo(() => photoFeedback.reduce((grouped, entry) => {
    const photoId = String(entry.photoId);
    grouped[photoId] = [...(grouped[photoId] || []), entry];
    return grouped;
  }, {}), [photoFeedback]);

  // "Ready to publish" count = already-live photos (staying live) + newly
  // selected ones — this is what will actually be in the gallery after
  // the next publish.
  const totalReadyCount = photoSummary?.selected ?? (publishedPhotos.length + selectedIds.size);

  const handleAssign = async (userId) => {
    if (updatingAssignmentIds.has(userId)) return;
    setUpdatingAssignmentIds((prev) => new Set(prev).add(userId));
    try {
      const updated = await eventsAPI.addTeamMember(id, userId);
      setEvent((prev) => ({
        ...prev,
        teamMembers: updated.teamMembers || [...(prev.teamMembers || []), userId],
      }));
    } catch (err) {
      toast.error(err.message || "Couldn't assign team member.");
    } finally {
      setUpdatingAssignmentIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleUnassign = async (userId) => {
    if (updatingAssignmentIds.has(userId)) return;
    setUpdatingAssignmentIds((prev) => new Set(prev).add(userId));
    try {
      const updated = await eventsAPI.removeTeamMember(id, userId);
      setEvent((prev) => ({ ...prev, teamMembers: updated.teamMembers || [] }));
      toast.success("Team member removed from this event.");
    } catch (err) {
      toast.error(err.message || "Couldn't remove team member from this event.");
    } finally {
      setUpdatingAssignmentIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
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

  const handleReviewRequest = async (requestId, status) => {
    setReviewingRequestId(requestId);
    try {
      await photoRequestsAPI.review(requestId, status);
      setCustomerRequests((prev) => prev.map((request) => request.id === requestId ? { ...request, status } : request));
      if (status === "APPROVED") await load();
      toast.success(status === "APPROVED" ? "Photo removed from the customer gallery." : "Request rejected.");
    } catch (err) {
      toast.error(err.message || "Couldn't review this request.");
    } finally {
      setReviewingRequestId(null);
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
      <div className="px-5 py-7 sm:px-8">
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
      <Topbar eyebrow={`Events / ${event?.name || ""}`} title={event?.name || "Loading…"}>
        {event && (
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Edit event
          </Button>
        )}
      </Topbar>

      <div className="px-5 py-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[320px] flex-1">
            <SummaryStrip
              stats={[
                { label: "Total uploaded", value: photoSummary?.total ?? photos?.length },
                { label: "Live in gallery", value: photos ? publishedPhotos.length : undefined },
                { label: "Awaiting review", value: photos ? pendingPhotos.length : undefined },
                { label: "Team assigned", value: event ? assigned.length : undefined },
              ]}
            />
          </div>
          <div className="w-full shrink-0 sm:w-[280px]">
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Team on this event</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assigning gives someone upload access. Removing an assignment revokes access but keeps their existing photos.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setAddMemberOpen(true)}>+ Add team member</Button>
        </div>
        {allTeamMembers === null ? (
          <div className="mt-4">
            <Loader label="Loading team" />
          </div>
        ) : allTeamMembers.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            You haven&apos;t added any team members yet — do that from the Team page first.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {assigned.map((m) => (
              <span key={idOf(m)} className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success-bg py-1 pl-2.5 pr-1 text-xs text-success">
                {m.name}
                <button
                  type="button"
                  onClick={() => handleUnassign(idOf(m))}
                  disabled={updatingAssignmentIds.has(idOf(m))}
                  className="rounded-full px-1.5 py-0.5 text-[11px] font-medium text-success hover:bg-success/15 disabled:opacity-50"
                  aria-label={`Remove ${m.name} from this event`}
                >
                  {updatingAssignmentIds.has(idOf(m)) ? "…" : "Remove"}
                </button>
              </span>
            ))}
            {unassigned.map((m) => (
              <button
                key={idOf(m)}
                onClick={() => handleAssign(idOf(m))}
                disabled={updatingAssignmentIds.has(idOf(m))}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {updatingAssignmentIds.has(idOf(m)) ? "Updating…" : `+ ${m.name}`}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Photo filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {photoSummary ? `${photoSummary.total} photos · ${photoSummary.selected} selected` : "Loading photo totals…"}
            </p>
          </div>
          {photoLoading && <span className="text-xs text-muted-foreground">Updating results…</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex rounded-lg border border-border p-1">
            {["all", "selected", "unselected"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setPhotoFilters((prev) => ({ ...prev, status }))}
                className={`rounded-md px-3 py-1.5 text-sm capitalize ${photoFilters.status === status ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {status}
              </button>
            ))}
          </div>
          <label className="min-w-[220px] text-sm text-muted-foreground">
            <span className="mb-1 block">Uploaded by</span>
            <select
              value={photoFilters.uploadedBy}
              onChange={(event) => setPhotoFilters((prev) => ({ ...prev, uploadedBy: event.target.value }))}
              className={`${inputClass()} w-full`}
            >
              <option value="all">All team members</option>
              {(allTeamMembers || []).map((member) => (
                <option key={idOf(member)} value={idOf(member)}>{member.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {photos === null && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Photos</h2>
          <div className="mt-4">
            <PhotoGridSkeleton count={12} />
          </div>
        </section>
      )}

      {photos && photos.length === 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Photos</h2>
          <div className="mt-4">
            <EmptyState
              title="No photos uploaded yet"
              description={photoFilters.status !== "all" || photoFilters.uploadedBy !== "all"
                ? "No photos match these filters. Try a different selection status or team member."
                : "Once your team starts uploading, their photos will show up here for you to review and select."}
            />
          </div>
        </section>
      )}

      {photos && photos.length > 0 && (
        <>
          {publishedPhotos.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Already published</h2>
                <span className="text-xs text-success">{publishedPhotos.length} live in gallery</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Already visible to the customer at this gallery link — locked here so nothing
                disappears from under them. Unpublish the gallery to make changes.
              </p>
              <div className="mt-4">
                <PhotoGrid photos={publishedPhotos} locked showDetails feedbackByPhoto={feedbackByPhoto} />
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {publishedPhotos.length > 0 ? "New uploads" : "Photos"}
              </h2>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} of {pendingPhotos.length} selected
              </span>
            </div>
            {publishedPhotos.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
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
                  showDetails
                  feedbackByPhoto={feedbackByPhoto}
                />
              )}
            </div>
          </section>
        </>
      )}

      <section className="mt-10 border-t border-border pt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Customer requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {customerRequests ? `${customerRequests.filter((request) => request.status === "PENDING").length} pending request${customerRequests.filter((request) => request.status === "PENDING").length === 1 ? "" : "s"}` : "Loading requests…"}
            </p>
          </div>
          <Button variant="secondary" onClick={loadRequests} disabled={requestsLoading}>Refresh</Button>
        </div>
        {requestsLoading && customerRequests === null ? (
          <div className="mt-4"><Loader label="Loading customer requests" /></div>
        ) : customerRequests?.length === 0 ? (
          <div className="mt-4"><EmptyState title="No customer requests" description="Requests submitted from the published gallery will appear here." /></div>
        ) : customerRequests?.length > 0 ? (
          <div className="mt-4 space-y-3">
            {customerRequests.map((request) => (
              <article key={request.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                {request.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS URL is dynamic
                  <img src={request.photoUrl} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{request.photoFilename}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{request.reason || "No reason provided."}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleString()} · {request.status}</p>
                </div>
                {request.status === "PENDING" && (
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => handleReviewRequest(request.id, "APPROVED")} disabled={reviewingRequestId === request.id}>Approve / remove</Button>
                    <Button variant="secondary" onClick={() => handleReviewRequest(request.id, "REJECTED")} disabled={reviewingRequestId === request.id}>Reject</Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </section>
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
      <AddAndAssignMemberModal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        onCreated={async (values) => {
          const member = await teamMembersAPI.create({ ...values, role: "team_member" });
          setAllTeamMembers((previous) => [member, ...(previous || [])]);
          try {
            const updated = await eventsAPI.addTeamMember(id, idOf(member));
            setEvent((previous) => ({ ...previous, teamMembers: updated.teamMembers || [] }));
          } catch (error) {
            // The account exists even if assignment failed, so retain it in
            // the unassigned list and still reveal its initial credentials.
            return { member, assignmentError: `${error.message || "The account was created but couldn't be assigned."} You can assign them from the event list.` };
          }
          return { member };
        }}
      />
    </div>
  );
}

function makeTemporaryPassword() {
  return Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
}

function AddAndAssignMemberModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const close = () => {
    if (saving) return;
    setForm({ name: "", email: "", password: "" });
    setError("");
    setCreated(null);
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError("Enter a name, valid email, and a password with at least 8 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await onCreated({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setCreated({ ...result.member, password: form.password });
      if (result.assignmentError) setError(result.assignmentError);
      else toast.success(`${result.member.name} was added and assigned to this event.`);
    } catch (submissionError) {
      setError(submissionError.message || "Couldn't add and assign this team member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={created ? (error ? "Team member created" : "Team member assigned") : "Add team member to this event"}>
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Share these sign-in details with {created.name}. The password is only shown here now.</p>
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <p>{created.email}</p>
            <p className="mt-1 font-medium text-primary">{created.password}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(`${created.email} / ${created.password}`).then(() => toast.show("Sign-in details copied."))}>Copy details</Button>
          <div className="flex justify-end"><Button type="button" onClick={close}>Done</Button></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">This creates a team-member account and immediately gives it upload access to this event.</p>
          <Field label="Name">
            <input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass()} placeholder="Rohan Mehta" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass()} placeholder="rohan@studio.com" />
          </Field>
          <Field label="Initial password">
            <div className="flex gap-2">
              <input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={inputClass()} placeholder="At least 8 characters" />
              <Button type="button" variant="secondary" onClick={() => setForm((current) => ({ ...current, password: makeTemporaryPassword() }))}>Generate</Button>
            </div>
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add & assign"}</Button>
          </div>
        </form>
      )}
    </Modal>
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
      <Card className="border-success/30 bg-success-bg py-4">
        <CardContent className="px-4">
          <Badge tone="published">Published</Badge>
          {url && (
            <p className="mt-2 max-w-[220px] truncate text-xs text-muted-foreground" title={url}>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Button onClick={onPublish} disabled={totalReadyCount === 0 || publishing}>
      {publishing ? "Publishing…" : "Publish gallery"}
    </Button>
  );
}

function CopyRow({ label, value, mono }) {
  const toast = useToast();
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
        <span className={`truncate text-sm ${mono ? "tracking-[0.3em]" : ""}`}>{value}</span>
        <button
          className="ml-3 flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => navigator.clipboard.writeText(value || "").then(() => toast.show(`${label} copied.`))}
        >
          <Copy className="size-3" /> Copy
        </button>
      </div>
    </div>
  );
}

function PublishRevealModal({ result, onClose }) {
  if (result && !result.isFirstPublish) {
    // Republish: PIN unchanged, nothing new to reveal — just confirm.
    return (
      <Modal open={!!result} onClose={onClose} title="Gallery updated">
        <p className="text-sm text-muted-foreground">
          The live gallery now reflects your latest selections. The existing PIN still works —
          it doesn&apos;t change on republish.
        </p>
        <div className="mt-4">
          <CopyRow label="Gallery link" value={result?.url} />
        </div>
        <Button className="mt-6 w-full" onClick={onClose}>
          Done
        </Button>
      </Modal>
    );
  }

  return (
    <Modal open={!!result} onClose={onClose} title="Gallery published">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Share this link and PIN with your customer. The PIN won&apos;t be shown again — copy it now.
      </p>
      <div className="mt-4 space-y-3">
        <CopyRow label="Gallery link" value={result?.url} />
        <CopyRow label="Access PIN" value={result?.pin} mono />
      </div>
      <Button className="mt-6 w-full" onClick={onClose}>
        Done
      </Button>
    </Modal>
  );
}

function PinRevealModal({ result, onClose }) {
  return (
    <Modal open={!!result} onClose={onClose} title="PIN regenerated">
      <p className="text-sm text-muted-foreground">
        The old PIN no longer works. This new PIN won&apos;t be shown again — copy it and send it
        to your customer.
      </p>
      <div className="mt-4">
        <CopyRow label="Access PIN" value={result?.pin} mono />
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
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {currentCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentCoverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Cover photo</p>
          <label className="inline-block cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            {coverFile ? coverFile.name : "Choose photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Shown on the events dashboard.</p>
        </div>
      </div>

      <div className="mt-5">
        <Field label="Event name" error={error}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass(null, !!error)}
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
