import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./mongodb";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "trizen_jwt_secret_key_2026";
const COOKIE_NAME = "token";

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

// Extracts a comparable id string whether `ref` is a raw ObjectId, a string,
// or a populated Mongoose document (which has an `_id` of its own). Without
// this, comparing a populated subdocument with String(memberId) stringifies
// the whole object instead of its id and the comparison silently never
// matches — which is what caused assigned team members to get a false
// "not assigned to this event" on populated routes.
function idString(ref) {
  if (ref === null || ref === undefined) return "";
  if (typeof ref === "object" && ref._id !== undefined) return String(ref._id);
  return String(ref);
}

// Shared authorization checks used across the /events, /photos, and
// /gallery admin routes so "can this user touch this event" is decided
// the same way everywhere.
export function isEventOwner(event, user) {
  return !!event && !!user && idString(event.createdBy) === String(user._id);
}

export function isAssignedToEvent(event, user) {
  if (!event || !user) return false;
  const targetId = String(user._id);
  return (event.assignedTeam || []).some((member) => idString(member) === targetId);
}

// True if this user (admin who owns the event, or team member assigned to
// it) is allowed to view/upload photos for the event.
export function canAccessEventPhotos(event, user) {
  if (!event || !user) return false;
  if (user.role === "admin") return isEventOwner(event, user);
  return isAssignedToEvent(event, user);
}
