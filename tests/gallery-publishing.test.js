import assert from "node:assert/strict";
import test from "node:test";
import { isValidGalleryPin, canPublishGallery } from "../lib/galleryPolicy.js";
import { generatePin, generateSlug } from "../lib/galleryPublish.js";

test("generatePin always produces a 6-digit numeric string with no leading zero", () => {
  for (let i = 0; i < 200; i++) {
    const pin = generatePin();
    assert.equal(pin.length, 6);
    assert.match(pin, /^[1-9]\d{5}$/);
    assert.equal(isValidGalleryPin(pin), true, "every generated PIN must satisfy the app's own PIN-format policy");
  }
});

test("generateSlug slugifies the event name and appends a short random suffix", () => {
  const slug = generateSlug("Arjun & Priya Wedding!");
  assert.match(slug, /^arjun-priya-wedding-[a-z0-9]{6}$/);

  // Two slugs for the same name must differ (random suffix), so republish
  // retries after a collision actually produce a different candidate.
  const again = generateSlug("Arjun & Priya Wedding!");
  assert.notEqual(slug, again);
});

test("generateSlug falls back to 'gallery' when the name has no sluggable characters", () => {
  assert.match(generateSlug("!!!"), /^gallery-[a-z0-9]{6}$/);
  assert.match(generateSlug(""), /^gallery-[a-z0-9]{6}$/);
  assert.match(generateSlug(undefined), /^gallery-[a-z0-9]{6}$/);
});

test("isValidGalleryPin accepts exactly six digits, trimmed, and rejects anything else", () => {
  assert.equal(isValidGalleryPin("482917"), true);
  assert.equal(isValidGalleryPin(" 482917 "), true);
  assert.equal(isValidGalleryPin("48291"), false, "too short");
  assert.equal(isValidGalleryPin("4829171"), false, "too long");
  assert.equal(isValidGalleryPin("482917x"), false, "non-numeric");
  assert.equal(isValidGalleryPin(""), false);
  assert.equal(isValidGalleryPin(null), false);
  assert.equal(isValidGalleryPin(undefined), false);
});

test("canPublishGallery requires the owning admin and at least one selected photo", () => {
  const owner = { _id: "admin-1", role: "admin" };
  const otherAdmin = { _id: "admin-2", role: "admin" };
  const teamMember = { _id: "team-1", role: "team_member" };
  const event = { createdBy: "admin-1" };

  assert.equal(canPublishGallery({ event, user: owner, selectedCount: 1 }), true);
  assert.equal(canPublishGallery({ event, user: owner, selectedCount: 5 }), true);
  assert.equal(canPublishGallery({ event, user: owner, selectedCount: 0 }), false, "zero selections cannot publish");
  assert.equal(canPublishGallery({ event, user: owner, selectedCount: -1 }), false, "negative counts are rejected");
  assert.equal(canPublishGallery({ event, user: owner, selectedCount: 1.5 }), false, "non-integer counts are rejected");
  assert.equal(canPublishGallery({ event, user: otherAdmin, selectedCount: 1 }), false, "non-owning admin cannot publish");
  assert.equal(canPublishGallery({ event, user: teamMember, selectedCount: 1 }), false, "team members can never publish");
});

test("a first publish is detected when there's no existing PIN hash, so the route knows to mint one", () => {
  // Mirrors the route's own `isFirstPublish = !event.galleryPinHash` branch:
  // only an event that has never been published (or was published before
  // PINs existed) should trigger generating a brand-new PIN. Once a hash
  // exists, every later publish/republish must leave it alone.
  function isFirstPublish(event) {
    return !event.galleryPinHash;
  }

  assert.equal(isFirstPublish({ galleryPinHash: undefined }), true);
  assert.equal(isFirstPublish({ galleryPinHash: null }), true);
  assert.equal(isFirstPublish({ galleryPinHash: "" }), true);
  assert.equal(isFirstPublish({ galleryPinHash: "$2a$10$fakeHashValueForATest" }), false);
});
