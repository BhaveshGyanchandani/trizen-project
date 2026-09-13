import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessEventPhotos,
  canManageTeamMember,
  canReadPhoto,
  isAssignedToEvent,
  isEventOwner,
} from "../lib/accessControl.js";

const owner = { _id: "admin-1", role: "admin" };
const assignedMember = { _id: "team-1", role: "team_member" };
const unassignedMember = { _id: "team-2", role: "team_member" };
const event = { createdBy: "admin-1", assignedTeam: [{ _id: "team-1" }] };
const photo = { uploadedBy: "team-1" };

test("event ownership and assignment are scoped to the current event", () => {
  assert.equal(isEventOwner(event, owner), true);
  assert.equal(isEventOwner(event, { _id: "admin-2", role: "admin" }), false);
  assert.equal(isAssignedToEvent(event, assignedMember), true);
  assert.equal(isAssignedToEvent(event, unassignedMember), false);
  assert.equal(canAccessEventPhotos(event, owner), true);
  assert.equal(canAccessEventPhotos(event, unassignedMember), false);
});

test("team members can view only their own uploads or already-published photos", () => {
  assert.equal(canReadPhoto({ event, photo, user: assignedMember }), true);
  assert.equal(canReadPhoto({ event, photo, user: unassignedMember }), false);
  assert.equal(canReadPhoto({ event, photo: { uploadedBy: "team-2" }, user: assignedMember }), false);
  assert.equal(canReadPhoto({ event, photo: { uploadedBy: "team-2" }, user: assignedMember, isPublished: true }), true);
  assert.equal(canReadPhoto({ event, photo, user: null, hasGalleryAccess: true }), true);
});

test("an admin can permanently remove only team members created in their own studio", () => {
  assert.equal(canManageTeamMember(owner, { role: "team_member", createdBy: "admin-1" }), true);
  assert.equal(canManageTeamMember(owner, { role: "team_member", createdBy: "admin-2" }), false);
  assert.equal(canManageTeamMember(owner, { role: "admin", createdBy: "admin-1" }), false);
});
