import assert from "node:assert/strict";
import test from "node:test";
import { canPublishGallery, isValidGalleryPin } from "../lib/galleryPolicy.js";

const owner = { _id: "admin-1", role: "admin" };
const otherAdmin = { _id: "admin-2", role: "admin" };
const teamMember = { _id: "team-1", role: "team_member" };
const event = { createdBy: "admin-1" };

test("gallery PIN validation accepts exactly six digits", () => {
  assert.equal(isValidGalleryPin("482917"), true);
  assert.equal(isValidGalleryPin(" 482917 "), true);
  assert.equal(isValidGalleryPin("48291"), false);
  assert.equal(isValidGalleryPin("482917x"), false);
});

test("only an owning admin with selected photos can publish", () => {
  assert.equal(canPublishGallery({ event, user: owner, selectedCount: 1 }), true);
  assert.equal(canPublishGallery({ event, user: owner, selectedCount: 0 }), false);
  assert.equal(canPublishGallery({ event, user: otherAdmin, selectedCount: 1 }), false);
  assert.equal(canPublishGallery({ event, user: teamMember, selectedCount: 1 }), false);
});
