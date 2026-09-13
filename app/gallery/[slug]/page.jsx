"use client";

import { use, useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Camera } from "lucide-react";
import { galleryPublicAPI } from "@/lib/api";
import PinEntryForm from "@/components/PinEntryForm";
import PhotoGrid, { PhotoGridSkeleton } from "@/components/PhotoGrid";
import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import Button from "@/components/Button";

function photoSrc(photo) {
  // Same resolution order as components/PhotoGrid.jsx: the GridFS-backed
  // API route first, since it's the only backend that survives a
  // serverless deploy — storageUrl is a legacy local-disk field.
  const id = photo.id || photo._id;
  if (id) return `/api/photos/${id}/file`;
  return photo.storageUrl || photo.url || photo.secure_url;
}

export default function CustomerGalleryPage({ params }) {
  const { slug } = use(params);

  const [meta, setMeta] = useState(null); // { name, photoCount } | undefined once fetched
  const [unavailable, setUnavailable] = useState(false);
  const [photos, setPhotos] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [requestPhoto, setRequestPhoto] = useState(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestNotice, setRequestNotice] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [feedbackPhoto, setFeedbackPhoto] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    galleryPublicAPI
      .getMeta(slug)
      .then(setMeta)
      .catch(() => setUnavailable(true));
  }, [slug]);

  const handleVerify = async (pin) => {
    const result = await galleryPublicAPI.verifyPin(slug, pin);
    setPhotos(Array.isArray(result) ? result : result.photos || []);
    try {
      const feedbackData = await galleryPublicAPI.listFeedback(slug);
      setFeedback(feedbackData?.feedback || []);
    } catch {
      // The gallery itself remains usable if this secondary list request is
      // interrupted; the customer can still submit feedback per photo.
      setFeedback([]);
    }
  };

  const openFeedback = (photo) => {
    const photoId = String(photo.id || photo._id);
    const existing = feedback.find((entry) => String(entry.photoId) === photoId);
    setFeedbackPhoto(photo);
    setRating(existing?.rating || 0);
    setFeedbackComment(existing?.comment || "");
    setFeedbackError("");
  };

  const submitRequest = async () => {
    if (!requestPhoto) return;
    setSubmittingRequest(true);
    setRequestError("");
    try {
      await galleryPublicAPI.createRequest(slug, { photoId: requestPhoto.id || requestPhoto._id, reason: requestReason });
      setRequestNotice("Your request was sent to the photographer for review.");
      setRequestPhoto(null);
      setRequestReason("");
    } catch (error) {
      setRequestError(error.message || "Couldn't submit your request. Please try again.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackPhoto || !rating) {
      setFeedbackError("Choose a rating from 1 to 5 stars.");
      return;
    }
    setSubmittingFeedback(true);
    setFeedbackError("");
    try {
      const saved = await galleryPublicAPI.saveFeedback(slug, {
        photoId: feedbackPhoto.id || feedbackPhoto._id,
        rating,
        comment: feedbackComment,
      });
      const photoId = String(feedbackPhoto.id || feedbackPhoto._id);
      setFeedback((current) => {
        const nextEntry = { ...saved, photoId, filename: feedbackPhoto.filename };
        const hasExisting = current.some((entry) => String(entry.photoId) === photoId);
        return hasExisting
          ? current.map((entry) => String(entry.photoId) === photoId ? nextEntry : entry)
          : [nextEntry, ...current];
      });
      setRequestNotice("Thanks — your rating and comment were sent to the photo team.");
      setFeedbackPhoto(null);
      setRating(0);
      setFeedbackComment("");
    } catch (error) {
      setFeedbackError(error.message || "Couldn't save your feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (unavailable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <p className="text-xl font-semibold">This gallery isn&apos;t available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may be out of date, or the gallery hasn&apos;t been published yet. Check with
            whoever shared it with you.
          </p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader label="Loading gallery" />
      </div>
    );
  }

  if (!photos) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-border bg-card">
            <Camera className="size-4.5 text-primary" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Gallery</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {meta.name || "Your photos are ready"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {meta.photoCount !== undefined ? `${meta.photoCount} photos are waiting for you — ` : ""}
            enter the PIN your photographer sent you.
          </p>
          <div className="mt-8 flex justify-center">
            <PinEntryForm onSubmit={handleVerify} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-10 text-center sm:py-14">
        <p className="text-xs font-medium text-muted-foreground">Gallery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{meta.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{photos.length} photos</p>
        {requestNotice && <p className="mx-auto mt-3 max-w-md text-sm text-success">{requestNotice}</p>}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {photos.length === 0 ? (
          <PhotoGridSkeleton count={0} />
        ) : (
          <PhotoGrid
            photos={photos}
            onPhotoClick={(index) => setLightboxIndex(index)}
            actions={[
              {
                label: "Rate & comment",
                onClick: openFeedback,
              },
              {
                label: "Request change",
                onClick: (photo) => {
                  setRequestPhoto(photo);
                  setRequestReason("");
                  setRequestError("");
                },
              },
            ]}
          />
        )}
      </main>

      <section className="mx-auto max-w-6xl border-t border-border px-4 py-8 sm:px-6">
        <h2 className="text-lg font-semibold">Your feedback</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ratings and comments you&apos;ve shared for this gallery. Select one to update it.</p>
        {feedback.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            You haven&apos;t rated a photo yet. Use “Rate & comment” on any image above.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feedback.map((entry) => {
              const photo = photos.find((item) => String(item.id || item._id) === String(entry.photoId));
              return (
                <button
                  key={entry.id || entry.photoId}
                  type="button"
                  onClick={() => photo && openFeedback(photo)}
                  className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
                >
                  <p className="truncate text-sm font-medium">{entry.filename || "Photo"}</p>
                  <p className="mt-1 text-base text-amber-400">{"★".repeat(entry.rating)}{"☆".repeat(5 - entry.rating)}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{entry.comment || "No comment"}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer className="px-6 pb-10 text-center text-[11px] text-muted-foreground">
        Shared via Trizen Photo Ops
      </footer>

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={photos.map((p) => ({ src: photoSrc(p), alt: p.filename }))}
        plugins={[Zoom]}
        styles={{ container: { backgroundColor: "rgba(23,24,28,0.96)" } }}
      />

      <Modal open={!!requestPhoto} onClose={() => !submittingRequest && setRequestPhoto(null)} title="Request a photo change">
        <p className="text-sm text-muted-foreground">
          Tell the photographer what you&apos;d like changed or why you don&apos;t want this photo included. A comment is optional.
        </p>
        <label className="mt-4 block text-sm font-medium">
          Reason
          <textarea
            value={requestReason}
            onChange={(event) => setRequestReason(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="For example: Please remove this photo from the gallery."
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {requestError && <p className="mt-2 text-sm text-destructive">{requestError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRequestPhoto(null)} disabled={submittingRequest}>Cancel</Button>
          <Button onClick={submitRequest} disabled={submittingRequest}>{submittingRequest ? "Submitting…" : "Submit request"}</Button>
        </div>
      </Modal>

      <Modal open={!!feedbackPhoto} onClose={() => !submittingFeedback && setFeedbackPhoto(null)} title="Rate this photo">
        <p className="text-sm text-muted-foreground">Your rating and optional comment are shared with the photographer&apos;s team.</p>
        <div className="mt-5 flex gap-1" role="radiogroup" aria-label="Photo rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              onClick={() => setRating(value)}
              className={`text-3xl leading-none transition-transform hover:scale-110 ${value <= rating ? "text-amber-400" : "text-muted-foreground/40"}`}
            >
              ★
            </button>
          ))}
        </div>
        <label className="mt-5 block text-sm font-medium">
          Comment <span className="font-normal text-muted-foreground">(optional)</span>
          <textarea
            value={feedbackComment}
            onChange={(event) => setFeedbackComment(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Tell us what you liked or what could be improved."
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {feedbackError && <p className="mt-2 text-sm text-destructive">{feedbackError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFeedbackPhoto(null)} disabled={submittingFeedback}>Cancel</Button>
          <Button onClick={submitFeedback} disabled={submittingFeedback}>{submittingFeedback ? "Sending…" : "Send feedback"}</Button>
        </div>
      </Modal>
    </div>
  );
}
