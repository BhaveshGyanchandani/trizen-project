import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  validateFeedbackInput,
  canReviewPhotoRequest,
  isValidRequestStatusFilter,
} from "../lib/requestValidation.js";
import { validateImageFile } from "../lib/imageValidation.js";
import { buildUploadFailure } from "../lib/uploadResult.js";

const validPhotoId = new mongoose.Types.ObjectId().toString();
const isValidObjectId = mongoose.isValidObjectId;

test("validateFeedbackInput rejects a photoId that isn't a real ObjectId, before checking anything else", () => {
  const result = validateFeedbackInput({ photoId: "not-an-id", rating: 5, comment: "" }, { isValidObjectId });
  assert.equal(result.valid, false);
  assert.equal(result.message, "That photo is not valid for this gallery.");
});

test("validateFeedbackInput only accepts an integer rating from 1 to 5", () => {
  const base = { photoId: validPhotoId, comment: "" };
  assert.equal(validateFeedbackInput({ ...base, rating: 1 }, { isValidObjectId }).valid, true);
  assert.equal(validateFeedbackInput({ ...base, rating: 5 }, { isValidObjectId }).valid, true);
  assert.equal(validateFeedbackInput({ ...base, rating: 0 }, { isValidObjectId }).valid, false);
  assert.equal(validateFeedbackInput({ ...base, rating: 6 }, { isValidObjectId }).valid, false);
  assert.equal(validateFeedbackInput({ ...base, rating: 3.5 }, { isValidObjectId }).valid, false, "half-star ratings are rejected");
  assert.equal(validateFeedbackInput({ ...base, rating: "3" }, { isValidObjectId }).valid, true, "numeric strings are coerced");
  assert.equal(validateFeedbackInput({ ...base, rating: "not-a-number" }, { isValidObjectId }).valid, false);
});

test("validateFeedbackInput rejects a comment over 1000 characters but allows exactly 1000", () => {
  const tooLong = "a".repeat(1001);
  const exactly1000 = "a".repeat(1000);
  assert.equal(validateFeedbackInput({ photoId: validPhotoId, rating: 4, comment: tooLong }, { isValidObjectId }).valid, false);
  assert.equal(validateFeedbackInput({ photoId: validPhotoId, rating: 4, comment: exactly1000 }, { isValidObjectId }).valid, true);
  assert.equal(validateFeedbackInput({ photoId: validPhotoId, rating: 4, comment: undefined }, { isValidObjectId }).valid, true, "comment is optional");
});

test("canReviewPhotoRequest only allows APPROVED/REJECTED and only from a PENDING request", () => {
  assert.equal(canReviewPhotoRequest({ requestedStatus: "APPROVED", currentStatus: "PENDING" }).valid, true);
  assert.equal(canReviewPhotoRequest({ requestedStatus: "REJECTED", currentStatus: "PENDING" }).valid, true);
  assert.equal(canReviewPhotoRequest({ requestedStatus: "PENDING", currentStatus: "PENDING" }).valid, false, "cannot set status back to PENDING");
  assert.equal(canReviewPhotoRequest({ requestedStatus: "APPROVED", currentStatus: "APPROVED" }).valid, false, "cannot re-review an already-approved request");
  assert.equal(canReviewPhotoRequest({ requestedStatus: "APPROVED", currentStatus: "REJECTED" }).valid, false, "cannot flip a rejected request to approved later");
});

test("isValidRequestStatusFilter only accepts the four known lifecycle values", () => {
  for (const status of ["all", "PENDING", "APPROVED", "REJECTED"]) {
    assert.equal(isValidRequestStatusFilter(status), true);
  }
  assert.equal(isValidRequestStatusFilter("pending"), false, "filter values are case-sensitive");
  assert.equal(isValidRequestStatusFilter("DELETED"), false);
  assert.equal(isValidRequestStatusFilter(""), false);
});

test("a storage failure (Cloudinary rejects the upload) is classified as storage_failed with no cleanup needed", () => {
  assert.throws(
    () => validateImageFile({ type: "application/zip", size: 1000, arrayBuffer: () => {} }),
    /Only JPEG, PNG, WebP, and GIF images are accepted\./
  );

  const failure = buildUploadFailure({ filename: "malware.zip", stored: undefined, error: new Error("Only JPEG, PNG, WebP, and GIF images are accepted."), cleanupFailed: false });
  assert.equal(failure.stage, "storage_failed");
  assert.equal(failure.success, false);
  assert.equal(failure.message, "Only JPEG, PNG, WebP, and GIF images are accepted.");
});

test("an oversized file is rejected before any network call, classified the same way as any other storage failure", () => {
  const oversized = { type: "image/png", size: 25 * 1024 * 1024, arrayBuffer: () => {} };
  assert.throws(() => validateImageFile(oversized), /20 MB or smaller/);
});

test("a database-write failure after a successful Cloudinary upload is classified as database_failed, and cleanup failure is surfaced in the message", () => {
  const stored = { cloudinaryPublicId: "trizen/events/e1/photo-1" };
  const withoutCleanupIssue = buildUploadFailure({ filename: "a.jpg", stored, error: new Error("Mongo validation failed"), cleanupFailed: false });
  assert.equal(withoutCleanupIssue.stage, "database_failed");
  assert.equal(withoutCleanupIssue.message, "Mongo validation failed");

  const withCleanupIssue = buildUploadFailure({ filename: "a.jpg", stored, error: new Error("Mongo validation failed"), cleanupFailed: true });
  assert.equal(withCleanupIssue.stage, "database_failed");
  assert.match(withCleanupIssue.message, /Cloudinary cleanup also failed; please contact an admin\.$/);
});
