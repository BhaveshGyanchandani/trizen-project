/** Generates the PIN and public slug assigned to an event when its gallery is published. */
import crypto from "node:crypto";

/** Generates a random 6-digit numeric PIN (100000–999999, no leading zero). */
export function generatePin() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

/**
 * Builds a URL-safe, likely-unique gallery slug from an event name (e.g.
 * "Arjun & Priya Wedding" → "arjun-priya-wedding-a1b2c3"). A random hex
 * suffix guards against collisions between events with the same name.
 */
export function generateSlug(name) {
  const clean = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = clean || "gallery";
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}
