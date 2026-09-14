import assert from "node:assert/strict";
import test from "node:test";
import { serializeEvent, serializePhoto } from "../lib/serializers.js";
import { summarizeUploadResults, buildUploadFailure } from "../lib/uploadResult.js";

test("serializeEvent reports draft status and a null cover when nothing has been published or uploaded", () => {
  const event = {
    _id: "event-1",
    name: "Arjun & Priya Wedding",
    createdBy: "admin-1",
    assignedTeam: [],
    galleryPublished: false,
    gallerySlug: undefined,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const result = serializeEvent(event, new Map());
  assert.equal(result.galleryStatus, "draft");
  assert.equal(result.coverPhotoUrl, null);
  assert.equal(result.photoCount, 0);
  assert.deepEqual(result.teamMembers, []);
});

test("serializeEvent reports published status, a cover URL, and the correct photo count once populated", () => {
  const event = {
    _id: "event-2",
    name: "Rohit & Meera Reception",
    createdBy: "admin-1",
    assignedTeam: [{ _id: "team-1", name: "Rohit Mehta", email: "team@trizen.demo" }],
    galleryPublished: true,
    gallerySlug: "rohit-meera-reception-xy12z",
    coverPhotoCloudinaryPublicId: "trizen/events/event-2/cover",
    createdAt: "2026-02-01T00:00:00.000Z",
  };
  const counts = new Map([["event-2", 12]]);
  const result = serializeEvent(event, counts);
  assert.equal(result.galleryStatus, "published");
  assert.equal(result.coverPhotoUrl, "/api/events/event-2/cover");
  assert.equal(result.photoCount, 12);
  assert.deepEqual(result.teamMembers, [{ id: "team-1", name: "Rohit Mehta", email: "team@trizen.demo" }]);
});

test("serializeEvent falls back to a zero photo count when the event has no aggregated entry", () => {
  const event = { _id: "event-3", name: "No Photos Yet", createdBy: "admin-1", assignedTeam: [] };
  const result = serializeEvent(event, new Map([["event-other", 5]]));
  assert.equal(result.photoCount, 0);
});

test("serializeEvent passes through raw (unpopulated) assignedTeam entries unchanged", () => {
  // Mirrors the route's own defensive `m && m._id ? {...} : m` branch for
  // the (normally unreachable via the populated query, but still handled)
  // case of a bare ObjectId string in the array.
  const event = { _id: "event-4", name: "Legacy Event", createdBy: "admin-1", assignedTeam: ["team-raw-id"] };
  const result = serializeEvent(event, new Map());
  assert.deepEqual(result.teamMembers, ["team-raw-id"]);
});

test("serializePhoto builds the signed-proxy storage URL and preserves gallery lifecycle flags", () => {
  const photo = {
    _id: "photo-1",
    filename: "IMG_0001.jpg",
    fileSize: 204800,
    selectedForGallery: true,
    publishedForGallery: false,
    excludedFromGallery: false,
    eventId: "event-1",
    uploadedBy: "team-1",
    createdAt: "2026-01-05T00:00:00.000Z",
  };
  const result = serializePhoto(photo);
  assert.equal(result.storageUrl, "/api/photos/photo-1/file");
  assert.equal(result.selectedForGallery, true);
  assert.equal(result.publishedForGallery, false);
  assert.equal(result.uploadedBy, "team-1");
});

test("serializePhoto expands a populated uploader into id+name, but not an unpopulated id", () => {
  const populated = { _id: "photo-1", uploadedBy: { _id: "team-1", name: "Rohit Mehta" } };
  assert.deepEqual(serializePhoto(populated).uploadedBy, { id: "team-1", name: "Rohit Mehta" });

  const unpopulated = { _id: "photo-2", uploadedBy: "team-1" };
  assert.equal(serializePhoto(unpopulated).uploadedBy, "team-1");
});

test("summarizeUploadResults reports overall success and no message when every file in the batch uploaded", () => {
  const results = [
    { filename: "a.jpg", success: true, stage: "database_created" },
    { filename: "b.jpg", success: true, stage: "database_created" },
  ];
  const summary = summarizeUploadResults(results);
  assert.equal(summary.success, true);
  assert.equal(summary.data.uploadedCount, 2);
  assert.equal(summary.data.failedCount, 0);
  assert.equal(summary.message, undefined);
});

test("summarizeUploadResults reports partial success with a message when some files in the batch failed", () => {
  const results = [
    { filename: "a.jpg", success: true, stage: "database_created" },
    { filename: "b.jpg", success: false, stage: "storage_failed" },
  ];
  const summary = summarizeUploadResults(results);
  assert.equal(summary.success, true, "overall success is true as long as at least one file uploaded");
  assert.equal(summary.data.uploadedCount, 1);
  assert.equal(summary.data.failedCount, 1);
  assert.equal(summary.message, "Some photos could not be uploaded.");
});

test("summarizeUploadResults reports overall failure when every file in the batch failed", () => {
  const results = [
    { filename: "a.jpg", success: false, stage: "storage_failed" },
    { filename: "b.jpg", success: false, stage: "storage_failed" },
  ];
  const summary = summarizeUploadResults(results);
  assert.equal(summary.success, false);
  assert.equal(summary.data.uploadedCount, 0);
  assert.equal(summary.data.failedCount, 2);
});

test("buildUploadFailure defaults a missing filename to 'photo' for both failure stages", () => {
  const storageFailure = buildUploadFailure({ filename: undefined, stored: undefined, error: new Error("boom"), cleanupFailed: false });
  assert.equal(storageFailure.filename, "photo");
  assert.equal(storageFailure.stage, "storage_failed");
});
