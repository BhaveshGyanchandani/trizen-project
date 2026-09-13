import { isEventOwner } from "./accessControl.js";

export function isValidGalleryPin(pin) {
  return /^\d{6}$/.test(String(pin || "").trim());
}

export function canPublishGallery({ event, user, selectedCount }) {
  return Boolean(
    user?.role === "admin" &&
    isEventOwner(event, user) &&
    Number.isInteger(selectedCount) &&
    selectedCount > 0
  );
}
