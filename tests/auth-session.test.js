import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import {
  signToken,
  verifyToken,
  createGalleryAccessToken,
  isValidGalleryAccessToken,
  galleryCookieName,
  authCookieName,
} from "../lib/jwtAuth.js";

test("signToken issues a verifiable JWT carrying the given payload", () => {
  const token = signToken({ id: "user-1", email: "admin@trizen.demo", role: "admin" });
  assert.equal(typeof token, "string");
  assert.equal(token.split(".").length, 3);

  const decoded = verifyToken(token);
  assert.equal(decoded.id, "user-1");
  assert.equal(decoded.email, "admin@trizen.demo");
  assert.equal(decoded.role, "admin");
  assert.equal(typeof decoded.exp, "number");
});

test("verifyToken rejects garbage, empty, and undefined tokens instead of throwing", () => {
  assert.equal(verifyToken("not-a-real-token"), null);
  assert.equal(verifyToken(""), null);
  assert.equal(verifyToken(undefined), null);
  assert.equal(verifyToken(null), null);
});

test("verifyToken rejects a token signed with a different secret (tampered/forged session)", () => {
  const forged = jwt.sign({ id: "attacker", role: "admin" }, "not-the-real-secret", { expiresIn: "7d" });
  assert.equal(verifyToken(forged), null);
});

test("verifyToken rejects an expired session token", () => {
  const secret = process.env.JWT_SECRET || "trizen_jwt_secret_key_2026";
  const expired = jwt.sign({ id: "user-1", role: "admin" }, secret, { expiresIn: -10 });
  assert.equal(verifyToken(expired), null);
});

test("gallery access tokens are scoped to one event+slug and rejected if either changes", () => {
  const event = { _id: "event-abc", gallerySlug: "arjun-priya-wedding-ab12cd" };
  const token = createGalleryAccessToken(event, "session-1");
  const decoded = verifyToken(token);

  assert.equal(decoded.type, "gallery_access");
  assert.equal(decoded.sessionId, "session-1");
  assert.equal(isValidGalleryAccessToken(decoded, event), true);
  assert.equal(isValidGalleryAccessToken(decoded, { _id: "event-other", gallerySlug: event.gallerySlug }), false);
  assert.equal(isValidGalleryAccessToken(decoded, { _id: event._id, gallerySlug: "some-other-slug" }), false);
  assert.equal(isValidGalleryAccessToken(null, event), false);
  assert.equal(isValidGalleryAccessToken({ type: "gallery_access", eventId: String(event._id), slug: event.gallerySlug }, event), false);
});

test("auth and gallery cookies use distinct, predictable names so sessions never collide", () => {
  assert.equal(authCookieName(), "token");
  assert.equal(galleryCookieName("event-1"), "gallery_access_event-1");
  assert.equal(galleryCookieName("event-2"), "gallery_access_event-2");
  assert.notEqual(galleryCookieName("event-1"), authCookieName());
});
