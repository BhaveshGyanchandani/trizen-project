/**
 * Session helpers: signs/verifies JWTs, manages the httpOnly auth cookie
 * for logged-in users, and manages the short-lived signed cookie that
 * proves a customer passed a gallery's PIN.
 */
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./mongodb";
import User from "@/models/User";
export { canAccessEventPhotos, isAssignedToEvent, isEventOwner } from "./accessControl.js";

const COOKIE_NAME = "token";
const GALLERY_COOKIE_PREFIX = "gallery_access_";

// Deliberately read lazily (inside a function), not at module scope — same
// reasoning as connectDB()'s MONGODB_URL check in ./mongodb.js: route
// handler modules get evaluated for metadata during `next build` and on
// serverless cold starts, so throwing at import time would fail the build
// itself rather than surface as a real runtime configuration error. There
// is deliberately NO fallback string here: a missing JWT_SECRET used to
// silently fall back to a hardcoded value, which would let anyone forge a
// valid admin session token against a misconfigured deployment.
function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to .env.local (see .env.local.example).");
  }
  return secret;
}

/** Signs a JWT for an authenticated user session (7-day expiry). */
export function signToken(payload) {
  return jwt.sign(payload, requireJwtSecret(), { expiresIn: "7d" });
}

/** Verifies a JWT, returning its decoded payload or null if invalid/expired. */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, requireJwtSecret());
  } catch {
    return null;
  }
}

/** Issues a signed session token for `user` and sets it as the httpOnly auth cookie. */
export async function setAuthCookie(user) {
  const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return token;
}

/** Removes the auth cookie, ending the current session (logout). */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Resolves the currently authenticated user from the request's auth
 * cookie, or null if there is no valid session. Excludes the password
 * hash from the returned document.
 */
export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded?.id) return null;

  await connectDB();
  const user = await User.findById(decoded.id).select("-password");
  return user;
}

// Gallery visitors have no account. A short-lived signed cookie proves that
// they passed the PIN for one specific gallery, without putting the PIN or
// any user data in the browser-readable page state.
/**
 * Issues a short-lived (12h) signed token proving `sessionId` passed the
 * PIN check for `event`'s gallery. Gallery visitors have no account. A
 * short-lived signed cookie proves that they passed the PIN for one
 * specific gallery, without putting the PIN or any user data in the
 * browser-readable page state.
 */
export function createGalleryAccessToken(event, sessionId) {
  return jwt.sign(
    { type: "gallery_access", eventId: String(event._id), slug: event.gallerySlug, sessionId },
    requireJwtSecret(),
    { expiresIn: "12h" }
  );
}

/**
 * Reads and validates the gallery-access cookie for `event`, returning
 * the decoded token (including `sessionId`) if it is valid for this
 * exact event and gallery slug, or null otherwise.
 */
export async function getGalleryAccess(event) {
  if (!event?._id || !event?.gallerySlug) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(`${GALLERY_COOKIE_PREFIX}${event._id}`)?.value;
  const decoded = verifyToken(token);
  if (
    decoded?.type !== "gallery_access" ||
    decoded.eventId !== String(event._id) ||
    decoded.slug !== event.gallerySlug ||
    !decoded.sessionId
  ) {
    return null;
  }
  return decoded;
}

/** Builds the gallery-access cookie name for a given event id. */
export function galleryCookieName(eventId) {
  return `${GALLERY_COOKIE_PREFIX}${eventId}`;
}
