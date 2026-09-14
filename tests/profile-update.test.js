import assert from "node:assert/strict";
import test from "node:test";
import { validateProfileUpdate } from "../lib/requestValidation.js";

test("an empty payload is valid and produces no updates (every field optional)", () => {
  const { valid, errors, updates } = validateProfileUpdate({});
  assert.equal(valid, true);
  assert.deepEqual(errors, {});
  assert.deepEqual(updates, {});
});

test("name is trimmed and rejected when blank", () => {
  const ok = validateProfileUpdate({ name: "  Priya Shah  " });
  assert.equal(ok.valid, true);
  assert.equal(ok.updates.name, "Priya Shah");

  const blank = validateProfileUpdate({ name: "   " });
  assert.equal(blank.valid, false);
  assert.ok(blank.errors.name);
});

test("email is lowercased/trimmed and rejected when malformed", () => {
  const ok = validateProfileUpdate({ email: "  Priya@Trizen.Demo " });
  assert.equal(ok.valid, true);
  assert.equal(ok.updates.email, "priya@trizen.demo");

  const bad = validateProfileUpdate({ email: "not-an-email" });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.email);
});

test("phone is optional but capped at 32 characters", () => {
  assert.equal(validateProfileUpdate({ phone: "+91 98765 43210" }).valid, true);
  const tooLong = validateProfileUpdate({ phone: "1".repeat(33) });
  assert.equal(tooLong.valid, false);
  assert.ok(tooLong.errors.phone);
});

test("bio is optional but capped at 280 characters", () => {
  assert.equal(validateProfileUpdate({ bio: "Wedding photographer." }).valid, true);
  const tooLong = validateProfileUpdate({ bio: "x".repeat(281) });
  assert.equal(tooLong.valid, false);
  assert.ok(tooLong.errors.bio);
});

test("password change requires both current and new password together", () => {
  const onlyCurrent = validateProfileUpdate({ currentPassword: "OldPass1" });
  assert.equal(onlyCurrent.valid, false);
  assert.ok(onlyCurrent.errors.password);

  const onlyNew = validateProfileUpdate({ newPassword: "NewPass1" });
  assert.equal(onlyNew.valid, false);
  assert.ok(onlyNew.errors.password);

  const both = validateProfileUpdate({ currentPassword: "OldPass1", newPassword: "NewPass1" });
  assert.equal(both.valid, true);
  assert.equal(both.updates.currentPassword, "OldPass1");
  assert.equal(both.updates.newPassword, "NewPass1");
});

test("new password must be at least 8 characters", () => {
  const tooShort = validateProfileUpdate({ currentPassword: "OldPass1", newPassword: "short" });
  assert.equal(tooShort.valid, false);
  assert.ok(tooShort.errors.password);
});

test("a mixed payload validates every field independently", () => {
  const { valid, errors, updates } = validateProfileUpdate({
    name: "Rohit Mehta",
    email: "rohit@trizen.demo",
    phone: "",
    bio: "Second shooter.",
  });
  assert.equal(valid, true);
  assert.deepEqual(errors, {});
  assert.equal(updates.name, "Rohit Mehta");
  assert.equal(updates.email, "rohit@trizen.demo");
  assert.equal(updates.phone, "");
  assert.equal(updates.bio, "Second shooter.");
});
