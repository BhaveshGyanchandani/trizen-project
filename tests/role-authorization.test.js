import assert from "node:assert/strict";
import test from "node:test";
import {
  isEventOwner,
  isAssignedToEvent,
  canAccessEventPhotos,
  canManageTeamMember,
  canAssignTeamMemberToEvent,
  isAlreadyAssigned,
} from "../lib/accessControl.js";

const adminA = { _id: "admin-a", role: "admin" };
const adminB = { _id: "admin-b", role: "admin" };
const teamMemberOfA = { _id: "team-a1", role: "team_member", createdBy: "admin-a" };
const teamMemberOfB = { _id: "team-b1", role: "team_member", createdBy: "admin-b" };
const eventOwnedByA = { createdBy: "admin-a", assignedTeam: [{ _id: "team-a1" }] };

test("an admin owns only events they created, never another admin's event", () => {
  assert.equal(isEventOwner(eventOwnedByA, adminA), true);
  assert.equal(isEventOwner(eventOwnedByA, adminB), false);
});

test("an event with no createdBy set is treated as ownerless-but-open (defensive default), not owned by everyone implicitly", () => {
  // Mirrors the existing `!event.createdBy || ...` short-circuit in
  // isEventOwner: a malformed/legacy event record without an owner doesn't
  // lock every admin out, but this is a narrow edge case worth pinning down
  // explicitly so a future change to the check is caught by a test.
  const ownerlessEvent = { assignedTeam: [] };
  assert.equal(isEventOwner(ownerlessEvent, adminA), true);
  assert.equal(isEventOwner(ownerlessEvent, adminB), true);
});

test("a team member has event access only when assigned, regardless of who created the event", () => {
  assert.equal(isAssignedToEvent(eventOwnedByA, teamMemberOfA), true);
  assert.equal(isAssignedToEvent(eventOwnedByA, teamMemberOfB), false);
  assert.equal(isAssignedToEvent(eventOwnedByA, { _id: "team-a1" }), true);
});

test("canAccessEventPhotos branches by role: admins need ownership, team members need assignment", () => {
  assert.equal(canAccessEventPhotos(eventOwnedByA, adminA), true);
  assert.equal(canAccessEventPhotos(eventOwnedByA, adminB), false);
  assert.equal(canAccessEventPhotos(eventOwnedByA, teamMemberOfA), true);
  assert.equal(canAccessEventPhotos(eventOwnedByA, teamMemberOfB), false);
  assert.equal(canAccessEventPhotos(eventOwnedByA, null), false);
  assert.equal(canAccessEventPhotos(null, adminA), false);
});

test("an admin can only manage (assign/remove/delete) team members they personally created", () => {
  assert.equal(canManageTeamMember(adminA, teamMemberOfA), true);
  assert.equal(canManageTeamMember(adminA, teamMemberOfB), false);
  assert.equal(canManageTeamMember(adminB, teamMemberOfA), false);
  // Another admin account is never a "team member" subject to this rule,
  // even if createdBy happened to line up.
  assert.equal(canManageTeamMember(adminA, { ...adminB, createdBy: "admin-a" }), false);
});

test("assigning a team member to an event requires the candidate to be that admin's own team_member", () => {
  assert.equal(canAssignTeamMemberToEvent({ admin: adminA, candidate: teamMemberOfA }), true);
  assert.equal(canAssignTeamMemberToEvent({ admin: adminA, candidate: teamMemberOfB }), false, "cannot assign another admin's team member");
  assert.equal(canAssignTeamMemberToEvent({ admin: adminA, candidate: adminB }), false, "cannot assign an arbitrary admin account");
  assert.equal(canAssignTeamMemberToEvent({ admin: teamMemberOfA, candidate: teamMemberOfB }), false, "only an admin can assign");
  assert.equal(canAssignTeamMemberToEvent({ admin: adminA, candidate: null }), false);
});

test("team assignment is idempotent: re-assigning an already-assigned member is detected and a no-op", () => {
  assert.equal(isAlreadyAssigned(eventOwnedByA, "team-a1"), true);
  assert.equal(isAlreadyAssigned(eventOwnedByA, { _id: "team-a1" }), true);
  assert.equal(isAlreadyAssigned(eventOwnedByA, "team-a2"), false);
  assert.equal(isAlreadyAssigned({ assignedTeam: [] }, "team-a1"), false);
});
