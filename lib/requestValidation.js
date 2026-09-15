/**
 * Validates a customer photo-feedback submission: a valid photo id, an
 * integer rating from 1–5, and an optional comment within length limits.
 * Returns `{ valid: true, normalizedRating }` or `{ valid: false, message }`.
 */
export function validateFeedbackInput({ photoId, rating, comment } = {}, helpers = {}) {
  const { isValidObjectId } = helpers;
  if (!photoId || (isValidObjectId && !isValidObjectId(photoId))) {
    return { valid: false, message: "That photo is not valid for this gallery." };
  }

  const numericRating = Number(rating);
  if (
    typeof rating === "undefined" ||
    rating === null ||
    isNaN(numericRating) ||
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return { valid: false, message: "Rating must be an integer between 1 and 5." };
  }

  if (comment && typeof comment === "string" && comment.length > 1000) {
    return { valid: false, message: "Comment exceeds maximum length of 1000 characters." };
  }

  return { valid: true, normalizedRating: numericRating };
}

/**
 * Whether an admin's decision on a photo change request is legal: the
 * request must currently be PENDING, and the new status must be
 * APPROVED or REJECTED.
 */
export function canReviewPhotoRequest({ requestedStatus, currentStatus } = {}) {
  if (currentStatus !== "PENDING") {
    return { valid: false, message: "Only pending requests can be reviewed." };
  }
  if (requestedStatus !== "APPROVED" && requestedStatus !== "REJECTED") {
    return { valid: false, message: "Requested status must be APPROVED or REJECTED." };
  }
  return { valid: true };
}

/** Whether `status` is one of the accepted photo-request list filters. */
export function isValidRequestStatusFilter(status) {
  return ["all", "PENDING", "APPROVED", "REJECTED"].includes(status);
}

// Shared by both roles: PATCH /api/auth/profile. Every field is optional —
// callers send only what changed. Returns the subset of fields that passed
// validation (trimmed/normalized), plus any errors keyed by field name.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a partial profile-update payload for PATCH /api/auth/profile.
 * Shared by both roles — every field is optional; callers send only what
 * changed. Returns the subset of fields that passed validation
 * (trimmed/normalized) plus any errors keyed by field name.
 */
export function validateProfileUpdate({ name, email, phone, bio, currentPassword, newPassword } = {}) {
  const errors = {};
  const updates = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) errors.name = "Name can't be empty.";
    else updates.name = trimmed;
  }

  if (email !== undefined) {
    const trimmed = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) errors.email = "Enter a valid email address.";
    else updates.email = trimmed;
  }

  if (phone !== undefined) {
    const trimmed = String(phone).trim();
    if (trimmed.length > 32) errors.phone = "Phone number is too long.";
    else updates.phone = trimmed;
  }

  if (bio !== undefined) {
    const trimmed = String(bio).trim();
    if (trimmed.length > 280) errors.bio = "Bio must be 280 characters or fewer.";
    else updates.bio = trimmed;
  }

  // Password change is all-or-nothing: both fields must arrive together so
  // we can verify the current password before setting a new one.
  const wantsPasswordChange = currentPassword !== undefined || newPassword !== undefined;
  if (wantsPasswordChange) {
    if (!currentPassword || !newPassword) {
      errors.password = "Enter your current password and a new password.";
    } else if (String(newPassword).length < 8) {
      errors.password = "New password must be at least 8 characters.";
    } else {
      updates.currentPassword = currentPassword;
      updates.newPassword = newPassword;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, updates };
}
