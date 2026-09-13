import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./mongodb";
import User from "@/models/User";
export { canAccessEventPhotos, isAssignedToEvent, isEventOwner } from "./accessControl.js";

const JWT_SECRET = process.env.JWT_SECRET || "trizen_jwt_secret_key_2026";
const COOKIE_NAME = "token";
const GALLERY_COOKIE_PREFIX = "gallery_access_";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

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

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

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
export function createGalleryAccessToken(event, sessionId) {
  return jwt.sign(
    { type: "gallery_access", eventId: String(event._id), slug: event.gallerySlug, sessionId },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

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

export function galleryCookieName(eventId) {
  return `${GALLERY_COOKIE_PREFIX}${eventId}`;
}
