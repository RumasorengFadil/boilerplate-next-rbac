import test from "node:test";
import assert from "node:assert/strict";
import { contentInputSchema, canTransition, isPublicStatus } from "../src/features/cms/schema.ts";
const translation = { title: "A real title", excerpt: "Verified editorial excerpt", body: "Business context and the actual published explanation." };
const draft = { kind: "ARTICLE", slug: "published-example", status: "DRAFT", translations: { id: translation, en: translation }, details: {} };
test("localized content contract validates both languages, UUID and safe assets", () => {
  assert.equal(contentInputSchema.safeParse(draft).success, true);
  assert.equal(contentInputSchema.safeParse({ ...draft, id: "1" }).success, false);
  assert.equal(contentInputSchema.safeParse({ ...draft, slug: "../private" }).success, false);
  assert.equal(contentInputSchema.safeParse({ ...draft, details: { image: "https://tracker.invalid/image" } }).success, false);
  assert.equal(contentInputSchema.safeParse({ ...draft, details: { image: "/images/../secret" } }).success, false);
});
test("review is required before publication and bilingual body cannot be empty", () => {
  assert.equal(canTransition("DRAFT", "PUBLISHED"), false);
  assert.equal(canTransition("DRAFT", "REVIEW"), true);
  assert.equal(canTransition("REVIEW", "PUBLISHED"), true);
  assert.equal(contentInputSchema.safeParse({ ...draft, status: "PUBLISHED", translations: { id: translation, en: { ...translation, body: "" } } }).success, false);
  assert.equal(contentInputSchema.safeParse({ ...draft, status: "SCHEDULED" }).success, false);
});
test("public visibility excludes drafts, review, archived and future schedules", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  const past = new Date("2026-10-03T11:00:00Z");
  const future = new Date("2026-10-03T13:00:00Z");
  for (const status of ["DRAFT", "REVIEW", "ARCHIVED"]) assert.equal(isPublicStatus(status, past, now), false);
  assert.equal(isPublicStatus("SCHEDULED", future, now), false);
  assert.equal(isPublicStatus("SCHEDULED", past, now), true);
  assert.equal(isPublicStatus("PUBLISHED", past, now), true);
  assert.equal(isPublicStatus("PUBLISHED", null, now), false);
});
