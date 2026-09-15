/**
 * NOTE: Superseded by lib/authHelper.js and not imported anywhere in this
 * codebase. Kept only for reference. Do not wire this back in as-is: unlike
 * authHelper.js, `JWT_SECRET` here silently falls back to a hardcoded
 * string when the environment variable is unset, which would let anyone
 * forge a valid session token against a misconfigured deployment.
 */
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "trizen_jwt_secret_key_2026";
const COOKIE_NAME = "token";
const GALLERY_COOKIE_PREFIX = "gallery_access_";

/** Signs a JWT for an authenticated user session (7-day expiry). */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/** Verifies a JWT, returning its decoded payload or null if invalid/expired. */
export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/** Issues a short-lived (12h) signed token proving `sessionId` passed the PIN check for `event`'s gallery. */
export function createGalleryAccessToken(event, sessionId) {
  return jwt.sign(
    { type: "gallery_access", eventId: String(event._id), slug: event.gallerySlug, sessionId },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

/** Whether a decoded gallery-access token is valid for this exact `event`. */
export function isValidGalleryAccessToken(decoded, event) {
  if (!decoded || !event) return false;
  return (
    decoded.type === "gallery_access" &&
    decoded.eventId === String(event._id) &&
    decoded.slug === event.gallerySlug &&
    Boolean(decoded.sessionId)
  );
}

/** Builds the gallery-access cookie name for a given event id. */
export function galleryCookieName(eventId) {
  return `${GALLERY_COOKIE_PREFIX}${eventId}`;
}

/** Name of the httpOnly cookie that stores the logged-in user's session token. */
export function authCookieName() {
  return COOKIE_NAME;
}
