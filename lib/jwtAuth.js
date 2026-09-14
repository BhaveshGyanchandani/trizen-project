import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "trizen_jwt_secret_key_2026";
const COOKIE_NAME = "token";
const GALLERY_COOKIE_PREFIX = "gallery_access_";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function createGalleryAccessToken(event, sessionId) {
  return jwt.sign(
    { type: "gallery_access", eventId: String(event._id), slug: event.gallerySlug, sessionId },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

export function isValidGalleryAccessToken(decoded, event) {
  if (!decoded || !event) return false;
  return (
    decoded.type === "gallery_access" &&
    decoded.eventId === String(event._id) &&
    decoded.slug === event.gallerySlug &&
    Boolean(decoded.sessionId)
  );
}

export function galleryCookieName(eventId) {
  return `${GALLERY_COOKIE_PREFIX}${eventId}`;
}

export function authCookieName() {
  return COOKIE_NAME;
}
