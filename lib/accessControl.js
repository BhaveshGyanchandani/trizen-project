// Pure authorization policies. Keeping these independent of Next.js request
// state lets routes share one security rule and gives them direct test coverage.
function idString(ref) {
  if (ref === null || ref === undefined) return "";
  return typeof ref === "object" && ref._id !== undefined ? String(ref._id) : String(ref);
}

export function isEventOwner(event, user) {
  return !!event && !!user && (!event.createdBy || idString(event.createdBy) === String(user._id));
}

export function isAssignedToEvent(event, user) {
  if (!event || !user) return false;
  const targetId = String(user._id);
  return (event.assignedTeam || []).some((member) => idString(member) === targetId);
}

export function canAccessEventPhotos(event, user) {
  if (!event || !user) return false;
  return user.role === "admin" ? isEventOwner(event, user) : isAssignedToEvent(event, user);
}

export function canManageTeamMember(admin, member) {
  return Boolean(
    admin?.role === "admin" &&
    member?.role === "team_member" &&
    member.createdBy &&
    String(member.createdBy) === String(admin._id)
  );
}

// Gallery/PIN access is handled before calling this policy. Logged-in team
// members can read only assets they uploaded; owners can read every event asset.
export function canReadPhoto({ event, photo, user, hasGalleryAccess = false, isPublished = false }) {
  if (hasGalleryAccess) return true;
  if (!canAccessEventPhotos(event, user)) return false;
  if (user.role !== "team_member") return true;
  return isPublished || String(photo.uploadedBy) === String(user._id);
}
