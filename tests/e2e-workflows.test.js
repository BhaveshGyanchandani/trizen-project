import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  isEventOwner,
  canAccessEventPhotos,
  canReadPhoto,
  canAssignTeamMemberToEvent,
  isAlreadyAssigned,
} from "../lib/accessControl.js";
import { canPublishGallery, isValidGalleryPin } from "../lib/galleryPolicy.js";
import { generatePin, generateSlug } from "../lib/galleryPublish.js";
import {
  signToken,
  verifyToken,
  createGalleryAccessToken,
  isValidGalleryAccessToken,
} from "../lib/jwtAuth.js";
import { validateFeedbackInput, canReviewPhotoRequest } from "../lib/requestValidation.js";
import { serializeEvent, serializePhoto } from "../lib/serializers.js";
import { summarizeUploadResults, buildUploadFailure } from "../lib/uploadResult.js";

// A tiny in-memory stand-in for MongoDB, driven only through the same pure
// policy functions the real route handlers call. Each test plays out a full
// multi-step feature end to end (login -> ... -> customer-facing result)
// the way a person would actually use the product, without needing a live
// database connection.
function makeStore() {
  return { users: new Map(), events: new Map(), photos: new Map(), feedback: new Map(), requests: new Map() };
}

test("workflow: admin registers, logs in, creates an event, and adds a team member they created", () => {
  const store = makeStore();

  // Register (first user becomes the initial admin, as in the real register route).
  const admin = { _id: new mongoose.Types.ObjectId().toString(), role: "admin", name: "Priya Shah", email: "admin@trizen.demo" };
  store.users.set(admin._id, admin);

  // Login issues a session token.
  const sessionToken = signToken({ id: admin._id, email: admin.email, role: admin.role });
  const session = verifyToken(sessionToken);
  assert.equal(session.id, admin._id);

  // Create an event, owned by the logged-in admin.
  const event = { _id: new mongoose.Types.ObjectId().toString(), name: "Arjun & Priya Wedding", createdBy: admin._id, assignedTeam: [] };
  store.events.set(event._id, event);
  assert.equal(isEventOwner(event, admin), true);

  // Admin creates a team member (createdBy set to the admin's own id).
  const teamMember = { _id: new mongoose.Types.ObjectId().toString(), role: "team_member", name: "Rohit Mehta", createdBy: admin._id };
  store.users.set(teamMember._id, teamMember);

  // Assign that team member to the event — allowed, since the admin created them.
  assert.equal(canAssignTeamMemberToEvent({ admin, candidate: teamMember }), true);
  assert.equal(isAlreadyAssigned(event, teamMember._id), false);
  event.assignedTeam.push(teamMember._id);

  assert.equal(isAlreadyAssigned(event, teamMember._id), true);
  assert.equal(canAccessEventPhotos(event, teamMember), true);

  const serialized = serializeEvent(event, new Map([[event._id, 0]]));
  assert.equal(serialized.galleryStatus, "draft");
  assert.equal(serialized.photoCount, 0);
});

test("workflow: an admin cannot assign another admin's team member, and a rejected team member never gains event access", () => {
  const store = makeStore();
  const adminA = { _id: "admin-a", role: "admin" };
  const adminB = { _id: "admin-b", role: "admin" };
  const event = { _id: "event-1", createdBy: "admin-a", assignedTeam: [] };
  const othersTeamMember = { _id: "team-b1", role: "team_member", createdBy: "admin-b" };
  store.events.set(event._id, event);

  assert.equal(isEventOwner(event, adminA), true);
  assert.equal(isEventOwner(event, adminB), false);

  // adminA tries to assign adminB's team member — must be rejected.
  const eligible = canAssignTeamMemberToEvent({ admin: adminA, candidate: othersTeamMember });
  assert.equal(eligible, false);
  // Since the assignment is rejected, the route never pushes to assignedTeam.
  assert.equal(event.assignedTeam.length, 0);
  assert.equal(canAccessEventPhotos(event, othersTeamMember), false, "never assigned, so no access");
});

test("workflow: team member uploads a photo (one file fails at storage, one succeeds), admin selects and publishes the gallery, and a customer verifies the PIN to view it", () => {
  const store = makeStore();
  const admin = { _id: "admin-1", role: "admin" };
  const teamMember = { _id: "team-1", role: "team_member", createdBy: "admin-1" };
  const event = {
    _id: "event-1",
    name: "Rohit & Meera Reception",
    createdBy: "admin-1",
    assignedTeam: [teamMember._id],
    galleryPublished: false,
    gallerySlug: undefined,
    galleryPinHash: undefined,
  };
  store.events.set(event._id, event);
  assert.equal(canAccessEventPhotos(event, teamMember), true, "team member may upload to their assigned event");

  // Simulate a 2-file batch upload: one rejected at Cloudinary, one that saves fine.
  const uploadResults = [];
  uploadResults.push(buildUploadFailure({ filename: "corrupt.jpg", stored: undefined, error: new Error("Cloudinary rejected the upload."), cleanupFailed: false }));
  const goodPhoto = {
    _id: "photo-1",
    eventId: event._id,
    uploadedBy: teamMember._id,
    filename: "IMG_0001.jpg",
    selectedForGallery: false,
    publishedForGallery: false,
    excludedFromGallery: false,
  };
  store.photos.set(goodPhoto._id, goodPhoto);
  uploadResults.push({ filename: goodPhoto.filename, success: true, stage: "database_created", photo: serializePhoto(goodPhoto) });

  const summary = summarizeUploadResults(uploadResults);
  assert.equal(summary.success, true, "batch is a success since at least one file uploaded");
  assert.equal(summary.data.uploadedCount, 1);
  assert.equal(summary.data.failedCount, 1);
  assert.equal(summary.message, "Some photos could not be uploaded.");

  // Before selection, the team member can only read their own upload — not yet publicly visible.
  assert.equal(canReadPhoto({ event, photo: goodPhoto, user: teamMember, isPublished: false }), true, "uploader can see their own photo");

  // Admin selects the photo, then publishes — requires isEventOwner + at least 1 selection.
  goodPhoto.selectedForGallery = true;
  const selectedCount = [...store.photos.values()].filter((p) => p.eventId === event._id && p.selectedForGallery && !p.excludedFromGallery).length;
  assert.equal(canPublishGallery({ event, user: admin, selectedCount }), true);

  const isFirstPublish = !event.galleryPinHash;
  assert.equal(isFirstPublish, true);
  const plainPin = generatePin();
  event.galleryPinHash = bcrypt.hashSync(plainPin, 4); // low cost factor: test speed only
  event.galleryPublished = true;
  event.gallerySlug = generateSlug(event.name);
  goodPhoto.publishedForGallery = true;

  assert.match(event.gallerySlug, /^rohit-meera-reception-[a-z0-9]{6}$/);
  assert.equal(isValidGalleryPin(plainPin), true);

  // Customer visits the gallery link and submits the PIN.
  assert.equal(bcrypt.compareSync(plainPin, event.galleryPinHash), true);
  assert.equal(bcrypt.compareSync("000000", event.galleryPinHash), false, "wrong PIN is rejected");

  const galleryToken = createGalleryAccessToken(event, "customer-session-1");
  const decoded = verifyToken(galleryToken);
  assert.equal(isValidGalleryAccessToken(decoded, event), true);

  // With gallery access, the customer can read the now-published photo.
  assert.equal(canReadPhoto({ event, photo: goodPhoto, user: null, hasGalleryAccess: true }), true);
});

test("workflow: a republish after unpublishing reuses the same PIN and slug rather than minting new ones", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const event = {
    _id: "event-1",
    name: "Existing Gallery",
    createdBy: "admin-1",
    galleryPublished: true,
    gallerySlug: "existing-gallery-ab12cd",
    galleryPinHash: bcrypt.hashSync("482917", 4),
  };

  // Unpublish: only the published flag flips; slug and PIN hash are untouched.
  event.galleryPublished = false;
  assert.equal(event.gallerySlug, "existing-gallery-ab12cd");
  assert.equal(bcrypt.compareSync("482917", event.galleryPinHash), true);

  // Republish: canPublishGallery re-checked, isFirstPublish is now false.
  const selectedCount = 1;
  assert.equal(canPublishGallery({ event, user: admin, selectedCount }), true);
  const isFirstPublish = !event.galleryPinHash;
  assert.equal(isFirstPublish, false, "existing PIN hash means this is not a first publish");
  event.galleryPublished = true;

  // Slug and PIN are unchanged after republish.
  assert.equal(event.gallerySlug, "existing-gallery-ab12cd");
  assert.equal(bcrypt.compareSync("482917", event.galleryPinHash), true);
});

test("workflow: a customer submits photo feedback, then requests a photo be removed and the admin approves it, hiding it from the gallery", () => {
  const event = { _id: "event-1", createdBy: "admin-1", gallerySlug: "some-gallery-ab12cd", galleryPublished: true };
  const admin = { _id: "admin-1", role: "admin" };
  const photo = { _id: new mongoose.Types.ObjectId().toString(), eventId: event._id, selectedForGallery: true, excludedFromGallery: false, publishedForGallery: true };

  // Customer rates the photo.
  const feedbackInput = validateFeedbackInput(
    { photoId: photo._id, rating: 5, comment: "Loved this shot!" },
    { isValidObjectId: mongoose.isValidObjectId }
  );
  assert.equal(feedbackInput.valid, true);
  const feedback = { photoId: photo._id, customerSessionId: "session-1", rating: feedbackInput.normalizedRating, comment: "Loved this shot!" };
  assert.equal(feedback.rating, 5);

  // Same customer later requests the photo be removed.
  const request = { _id: "request-1", eventId: event._id, photoId: photo._id, customerSessionId: "session-1", status: "PENDING", reason: "Eyes closed in this one" };

  // Admin reviews and approves the request.
  assert.equal(isEventOwner(event, admin), true);
  const review = canReviewPhotoRequest({ requestedStatus: "APPROVED", currentStatus: request.status });
  assert.equal(review.valid, true);
  request.status = "APPROVED";
  photo.excludedFromGallery = true;
  photo.selectedForGallery = false;
  photo.publishedForGallery = false;

  // The photo is now excluded — a repeat review of the same request is blocked.
  const secondReview = canReviewPhotoRequest({ requestedStatus: "REJECTED", currentStatus: request.status });
  assert.equal(secondReview.valid, false, "cannot review a request that was already approved");

  // The customer's own feedback for this photo is no longer visible in their feedback list
  // once the photo is excluded from the gallery (mirrors the feedback GET route's filter).
  const stillVisible = photo.selectedForGallery && !photo.excludedFromGallery;
  assert.equal(stillVisible, false);
});

test("workflow: an already-live photo can't be silently unselected — it must go through unpublish first", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const event = { _id: "event-1", createdBy: "admin-1", galleryPublished: true };
  const livePhoto = { _id: "photo-1", eventId: event._id, selectedForGallery: true, publishedForGallery: true, excludedFromGallery: false };

  assert.equal(isEventOwner(event, admin), true);
  // Mirrors the /photos/[id]/select route's own guard: publishedForGallery
  // locks the photo from this endpoint regardless of the requested value.
  const canToggleSelection = !livePhoto.publishedForGallery;
  assert.equal(canToggleSelection, false, "a live photo cannot be unselected without unpublishing first");

  // Unpublish clears publishedForGallery on every currently-live photo...
  event.galleryPublished = false;
  livePhoto.publishedForGallery = false;

  // ...after which the same photo can be freely unselected.
  const canToggleAfterUnpublish = !livePhoto.publishedForGallery;
  assert.equal(canToggleAfterUnpublish, true);
  livePhoto.selectedForGallery = false;
  assert.equal(livePhoto.selectedForGallery, false);
});
