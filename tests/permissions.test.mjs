import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../src/lib/permissions.ts";
test("phase 2 specialist roles have explicit least-privilege grants", () => {
  assert.equal(hasPermission("CONTENT_EDITOR", "content:write"), true);
  assert.equal(hasPermission("CONTENT_EDITOR", "content:publish"), false);
  assert.equal(hasPermission("CONTENT_EDITOR", "leads:read"), false);
  assert.equal(hasPermission("SALES", "leads:write"), true);
  assert.equal(hasPermission("SALES", "content:write"), false);
  assert.equal(hasPermission("MARKETING", "analytics:read"), true);
  assert.equal(hasPermission("MARKETING", "users:manage"), false);
  assert.equal(hasPermission("MEMBER", "leads:read"), false);
  assert.equal(hasPermission("MEMBER", "ai:manage"), false);
});
test("existing admin access is retained and super admin owns account mutations", () => {
  for (const permission of ["users:read", "projects:read", "ai:manage", "content:publish", "leads:write"]) {
    assert.equal(hasPermission("ADMIN", permission), true);
    assert.equal(hasPermission("SUPER_ADMIN", permission), true);
  }
  assert.equal(hasPermission("SUPER_ADMIN", "users:manage"), true);
  assert.equal(hasPermission("ADMIN", "users:manage"), false);
});
