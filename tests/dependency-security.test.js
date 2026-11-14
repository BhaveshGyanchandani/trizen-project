import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lockfilePath = new URL("../package-lock.json", import.meta.url);
const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));

test("zod resolves to the CVE-fixed version (GHSA-mrhx-c7xc-m3w5)", () => {
  const zod = lockfile.packages["node_modules/zod"];
  assert.ok(zod, "zod entry should exist in package-lock.json");
  assert.equal(zod.version, "4.6.6");
});

test("undici resolves to the CVE-fixed version (GHSA-xjj6-f33q-929c)", () => {
  const undiciKeys = Object.keys(lockfile.packages).filter((key) =>
    key === "node_modules/undici" || key.endsWith("/node_modules/undici")
  );
  assert.ok(undiciKeys.length > 0, "undici entry should exist in package-lock.json");
  for (const key of undiciKeys) {
    assert.equal(lockfile.packages[key].version, "6.29.1");
  }
});

test("mongoose resolves to the CVE-fixed version (GHSA-8332-j7wj-wjw4, GHSA-gg4r-jv3p-qx3c)", () => {
  const mongoose = lockfile.packages["node_modules/mongoose"];
  assert.ok(mongoose, "mongoose entry should exist in package-lock.json");
  assert.equal(mongoose.version, "9.11.4");
});
