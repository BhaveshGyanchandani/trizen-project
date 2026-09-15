/** Business rules for gallery PIN format and gallery publish eligibility. */
import { isEventOwner } from "./accessControl.js";

/** Whether `pin` is a valid 6-digit gallery PIN. */
export function isValidGalleryPin(pin) {
  return /^\d{6}$/.test(String(pin || "").trim());
}

/**
 * Whether `user` may publish `event`'s gallery: must be the owning admin,
 * and at least one photo must be selected for the gallery.
 */
export function canPublishGallery({ event, user, selectedCount }) {
  return Boolean(
    user?.role === "admin" &&
    isEventOwner(event, user) &&
    Number.isInteger(selectedCount) &&
    selectedCount > 0
  );
}
