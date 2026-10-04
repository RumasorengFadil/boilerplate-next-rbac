import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import sharp from "sharp";
if (new URL(process.env.DATABASE_URL || "postgresql://invalid").pathname !== "/lunabiner_portfolio_test") throw new Error("Use the disposable portfolio database.");
const { db } = await import("../src/lib/db.ts");
const { savePortfolioAction, portfolioLifecycleAction } = await import("../src/features/portfolio/actions.ts");
const { savePortfolio } = await import("../src/features/portfolio/service.ts");
const { parseCoverPath } = await import("../src/features/portfolio/cover-schema.ts");
const { GET } = await import("../src/app/media/portfolio/[contentId]/[assetId]/route.ts");
const image = await sharp({ create: { width: 80, height: 40, channels: 3, background: "#08747a" } }).png().toBuffer();
const form = (row, operation = "keep", version = row?.version) => {
  const result = new FormData();
  for (const [key, value] of Object.entries({ ...(row ? { id: row.id } : {}), version: version ?? 1, slug: row?.slug ?? "cover-" + randomUUID(), status: row?.status ?? "DRAFT", coverOperation: operation })) result.set(key, String(value));
  for (const locale of ["id", "en"]) {
    result.set(locale + ".title", "Cover illustration"); result.set(locale + ".excerpt", "An isolated portfolio cover example.");
    result.set(locale + ".richBody", JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "This example is used only for isolated cover acceptance testing." }] }] }));
  }
  if (operation === "replace") result.set("coverFile", new File([image], "../../unsafe.png", { type: "image/png" }));
  return result;
};
const response = path => GET(new Request("http://localhost" + path), { params: Promise.resolve(parseCoverPath(path)) });
test("upload/save/keep/remove/conflict and media eligibility preserve records and enforce permissions", async () => {
  const directory = await mkdtemp("/private/tmp/lunabiner-cover-integration-");
  process.env.PORTFOLIO_UPLOAD_DIR = directory;
  const users = [], ids = [], tokens = {};
  try {
    for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES"]) {
      const token = randomUUID(), user = await db.user.create({ data: { name: "Cover fixture", email: token + "@example.test", role, passwordHash: "synthetic" } });
      users.push(user.id); tokens[role] = token;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
    }
    globalThis.__phase2TestCookie = tokens.SALES;
    await assert.rejects(() => savePortfolioAction({ message: "" }, form(null, "replace")), /Unauthorized/);
    assert.equal((await readdir(directory)).length, 0);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const saved = await savePortfolioAction({ message: "" }, form(null, "replace")); assert.equal(saved.success, true); ids.push(saved.id);
    let row = await db.contentEntry.findUniqueOrThrow({ where: { id: saved.id } });
    const original = row.details.image; assert.equal(parseCoverPath(original).contentId, row.id);
    assert.equal((await response(original)).status, 200);
    globalThis.__phase2TestCookie = undefined; assert.equal((await response(original)).status, 404);
    globalThis.__phase2TestCookie = tokens.SALES; assert.equal((await response(original)).status, 404);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const keep = form(row); keep.set("image", "/images/lunabiner-logo.png");
    assert.equal((await savePortfolioAction({ message: "" }, keep)).success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.details.image, original);
    const filesBefore = await readdir(directory + "/" + row.id);
    assert.equal((await savePortfolioAction({ message: "" }, form(row, "replace", row.version - 1))).success, undefined);
    assert.deepEqual(await readdir(directory + "/" + row.id), filesBefore);
    const bad = form(row, "replace"); bad.set("coverFile", new File(["not a png"], "fake.png", { type: "image/png" }));
    assert.deepEqual((await savePortfolioAction({ message: "" }, bad)).fields, ["coverFile"]);
    assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } })).details.image, original);
    assert.equal((await savePortfolioAction({ message: "" }, form(row, "replace"))).success, true);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); const current = row.details.image; assert.notEqual(current, original);
    assert.equal((await response(original)).status, 404); assert.equal((await readdir(directory + "/" + row.id)).length, 2);
    const review = form(row); review.set("status", "REVIEW"); await savePortfolioAction({ message: "" }, review);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); const publish = form(row); publish.set("status", "PUBLISHED"); await savePortfolioAction({ message: "" }, publish);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } });
    globalThis.__phase2TestCookie = undefined;
    const publicImage = await response(current); assert.equal(publicImage.status, 200); assert.equal(publicImage.headers.get("content-type"), "image/webp");
    assert.equal(publicImage.headers.get("cache-control"), "private, no-store"); assert.equal(publicImage.headers.get("x-content-type-options"), "nosniff");
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    assert.equal((await savePortfolioAction({ message: "" }, form(row, "replace"))).success, undefined);
    assert.equal((await readdir(directory + "/" + row.id)).length, 2);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const other = await savePortfolio({ kind: "CASE_STUDY", slug: "other-" + randomUUID(), status: "DRAFT", translations: row.translations, details: {} }); ids.push(other.id);
    await assert.rejects(() => savePortfolio({ id: other.id, version: other.version, kind: "CASE_STUDY", slug: other.slug, status: "DRAFT", translations: row.translations, details: { image: current } }), /another portfolio/i);
    const lifecycle = new FormData(); lifecycle.set("id", row.id); lifecycle.set("version", String(row.version)); lifecycle.set("operation", "archive");
    await portfolioLifecycleAction({ message: "" }, lifecycle);
    globalThis.__phase2TestCookie = undefined; assert.equal((await response(current)).status, 404);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); lifecycle.set("version", String(row.version)); lifecycle.set("operation", "restore"); await portfolioLifecycleAction({ message: "" }, lifecycle);
    row = await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(row.details.image, current);
    assert.equal((await savePortfolioAction({ message: "" }, form(row, "remove"))).success, true);
    assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: row.id } })).details.image, "");
    assert.equal((await response(current)).status, 404); assert.equal((await readdir(directory + "/" + row.id)).length, 2);
    const audits = await db.auditEvent.findMany({ where: { recordId: row.id, action: "content.update" } }); assert.ok(audits.some(item => item.before.image && item.after.image === ""));
  } finally {
    globalThis.__phase2TestCookie = undefined; delete process.env.PORTFOLIO_UPLOAD_DIR;
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } }); await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.contentEntry.deleteMany({ where: { id: { in: ids } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
    assert.ok(directory.startsWith("/private/tmp/lunabiner-cover-integration-")); await rm(directory, { recursive: true });
  }
});
