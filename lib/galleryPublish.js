import crypto from "node:crypto";

export function generatePin() {
  // Always produce a 6-digit numeric string with no leading zero (100000 - 999999)
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

export function generateSlug(name) {
  const clean = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = clean || "gallery";
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}
