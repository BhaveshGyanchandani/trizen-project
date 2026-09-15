// Pure authorization policies. Keeping these independent of Next.js request
// state lets routes share one security rule and gives them direct test coverage.

/**
 * Normalizes a value that may be a populated document, a raw ObjectId, or
 * a string into a plain string id for comparison.
 */
function idString(ref) {
  if (ref === null || ref === undefined) return "";
  return typeof ref === "object" && ref._id !== undefined ? String(ref._id) : String(ref);
}

/** Whether `user` is the admin who created `event`. */
export function isEventOwner(event, user) {
  return !!event && !!user && (!event.createdBy || idString(event.createdBy) === String(user._id));
}

/** Whether `user` appears in `event.assignedTeam`. */
export function isAssignedToEvent(event, user) {
  if (!event || !user) return false;
  const targetId = String(user._id);
  return (event.assignedTeam || []).some((member) => idString(member) === targetId);
}

/**
 * Whether `user` may access an event's photos at all: owning admins always
 * can, team members only when assigned to the event.
 */
export function canAccessEventPhotos(event, user) {
  if (!event || !user) return false;
  return user.role === "admin" ? isEventOwner(event, user) : isAssignedToEvent(event, user);
}

/** Whether `admin` may manage `member` — i.e. `member` is a team account `admin` created. */
export function canManageTeamMember(admin, member) {
  return Boolean(
    admin?.role === "admin" &&
    member?.role === "team_member" &&
    member.createdBy &&
    String(member.createdBy) === String(admin._id)
  );
}

/**
 * Whether `user` may view a specific photo.
 *
 * Gallery/PIN access is handled before calling this policy. Logged-in team
 * members can read only assets they uploaded; owners can read every event asset.
 */
export function canReadPhoto({ event, photo, user, hasGalleryAccess = false, isPublished = false }) {
  if (hasGalleryAccess) return true;
  if (!canAccessEventPhotos(event, user)) return false;
  if (user.role !== "team_member") return true;
  return isPublished || String(photo.uploadedBy) === String(user._id);
}

/** Whether `admin` may assign `candidate` (a team member) to one of their events. */
export function canAssignTeamMemberToEvent({ admin, candidate } = {}) {
  return canManageTeamMember(admin, candidate);
}

/** Whether `member` is already present in `event.assignedTeam`. */
export function isAlreadyAssigned(event, member) {
  if (!event || !member) return false;
  const memberId = typeof member === "object" && member !== null ? String(member._id) : String(member);
  return (event.assignedTeam || []).some(
    (item) => (typeof item === "object" && item !== null ? String(item._id) : String(item)) === memberId
  );
}
