import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "../lib/rateLimit.js";

test("allows attempts under the max, and denies once the max is reached", () => {
  const key = `test-key-${Math.random()}`;
  for (let i = 0; i < 3; i++) {
    const result = checkRateLimit(key, { max: 3, windowMs: 60_000 });
    assert.equal(result.allowed, true, `attempt ${i + 1} should be allowed`);
  }
  const blocked = checkRateLimit(key, { max: 3, windowMs: 60_000 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterMs > 0);
});

test("remaining count decreases with each attempt", () => {
  const key = `test-key-${Math.random()}`;
  const first = checkRateLimit(key, { max: 5, windowMs: 60_000 });
  assert.equal(first.remaining, 4);
  const second = checkRateLimit(key, { max: 5, windowMs: 60_000 });
  assert.equal(second.remaining, 3);
});

test("different keys are tracked independently (one gallery/IP can't lock out another)", () => {
  const keyA = `gallery-a-${Math.random()}`;
  const keyB = `gallery-b-${Math.random()}`;
  for (let i = 0; i < 3; i++) checkRateLimit(keyA, { max: 3, windowMs: 60_000 });
  const blockedA = checkRateLimit(keyA, { max: 3, windowMs: 60_000 });
  const freshB = checkRateLimit(keyB, { max: 3, windowMs: 60_000 });
  assert.equal(blockedA.allowed, false);
  assert.equal(freshB.allowed, true);
});

test("a fresh window resets the counter after it expires", async () => {
  const key = `test-key-${Math.random()}`;
  const windowMs = 20;
  checkRateLimit(key, { max: 1, windowMs });
  const blocked = checkRateLimit(key, { max: 1, windowMs });
  assert.equal(blocked.allowed, false);

  await new Promise((resolve) => setTimeout(resolve, windowMs + 10));

  const afterWindow = checkRateLimit(key, { max: 1, windowMs });
  assert.equal(afterWindow.allowed, true);
});
