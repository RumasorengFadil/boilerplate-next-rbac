import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { getSchema } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/lunabiner_portfolio_test")
  throw new Error("Use the dedicated lunabiner_portfolio_test database.");
const { db } = await import("../src/lib/db.ts");
const { savePortfolioAction, portfolioLifecycleAction } = await import("../src/features/portfolio/actions.ts");
const { parseContentForm } = await import("../src/features/cms/form.ts");
const { richDocumentSchema, safeRichLink } = await import("../src/features/cms/rich-text.ts");

test("Tiptap list/link defaults round-trip through the strict server contract", () => {
  const schema = getSchema([StarterKit.configure({ heading: { levels: [2, 3, 4] }, underline: false, trailingNode: false, link: { isAllowedUri: safeRichLink } })]);
  const document = schema.nodeFromJSON({ type: "doc", content: [{ type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Business context", marks: [{ type: "link", attrs: { href: "/id/contact" } }] }] }] }] }] }).toJSON();
  assert.equal(richDocumentSchema.safeParse(document).success, true);
  assert.equal(document.content[0].attrs.type, null);
  assert.equal(document.content[0].content[0].content[0].content[0].marks[0].attrs.title, null);
});

test("portfolio actions validate untrusted forms, preserve rich data and enforce publisher permissions", async () => {
  const users = [], ids = [], tokens = {};
  const richBody = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "A complete business workflow illustration for editor tests.", marks: [{ type: "bold" }] }] }] };
  const form = ({ id, version = 1, status = "DRAFT", slug = "action-" + randomUUID() } = {}) => {
    const data = new FormData();
    if (id) data.set("id", id);
    data.set("version", String(version)); data.set("slug", slug); data.set("status", status);
    for (const locale of ["id", "en"]) {
      data.set(`${locale}.title`, "Action test illustration"); data.set(`${locale}.excerpt`, "Complete bilingual illustration excerpt.");
      data.set(`${locale}.richBody`, JSON.stringify(richBody));
    }
    return data;
  };
  const lifecycle = (id, version, operation) => { const data = new FormData(); data.set("id", id); data.set("version", String(version)); data.set("operation", operation); return data; };
  try {
    for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES"]) {
      const token = randomUUID(); tokens[role] = token;
      const user = await db.user.create({ data: { email: token + "@example.test", name: "Action fixture", role, passwordHash: "synthetic-test-only" } }); users.push(user.id);
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } });
    }
    globalThis.__phase2TestCookie = tokens.SALES;
    await assert.rejects(() => savePortfolioAction({ message: "" }, form()), /Unauthorized/);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    const malformed = form(); malformed.set("id.richBody", "{broken");
    assert.equal((await savePortfolioAction({ message: "" }, malformed)).success, undefined);
    const unsafe = form(); unsafe.set("slug", "1");
    assert.ok((await savePortfolioAction({ message: "" }, unsafe)).fields.includes("slug"));
    const invalidRich = form(); invalidRich.set("en.richBody", JSON.stringify({ type: "doc", content: [{ type: "image", attrs: { src: "https://tracker.test" } }] }));
    assert.equal((await savePortfolioAction({ message: "" }, invalidRich)).success, undefined);
    const createForm = form(); createForm.set("verifiedProject", "on"); createForm.set("client", "Untrusted client");
    let saved = await savePortfolioAction({ message: "" }, createForm); assert.equal(saved.success, true); ids.push(saved.id);
    const createdDetails = (await db.contentEntry.findUniqueOrThrow({ where: { id: saved.id } })).details;
    assert.equal(createdDetails.verifiedProject, false); assert.equal(createdDetails.client, "");
    assert.deepEqual((await db.contentEntry.findUniqueOrThrow({ where: { id: saved.id } })).translations.id.richBody, richBody);
    const slug = (await db.contentEntry.findUniqueOrThrow({ where: { id: saved.id } })).slug;
    const legacyDetails = { client: "Legacy client", verifiedProject: true, industry: { id: "Operasional", en: "Operations" },
      challenge: { id: "Tantangan lama", en: "Legacy challenge" }, technology: ["Next.js"], capabilities: ["software"],
      relatedServices: ["software"], ctaPath: "/en/contact" };
    const previousDetails = (await db.contentEntry.findUniqueOrThrow({ where: { id: saved.id } })).details;
    await db.contentEntry.update({ where: { id: saved.id }, data: { details: { ...previousDetails, ...legacyDetails } } });
    const editorial = form({ id: saved.id, version: saved.version, slug });
    editorial.set("category", "Editorial category"); editorial.set("tags", "operations, automation");
    editorial.set("authorName", "Editorial author"); editorial.set("image", "/images/test-cover.png");
    editorial.set("client", "Untrusted overwrite"); editorial.set("verifiedProject", "on"); editorial.set("industry.id", "Overwrite");
    assert.equal(parseContentForm(editorial, true).details.client, undefined);
    assert.equal(parseContentForm(editorial).details.client, "Untrusted overwrite");
    saved = await savePortfolioAction({ message: "" }, editorial); assert.equal(saved.success, true);
    const retained = (await db.contentEntry.findUniqueOrThrow({ where: { id: saved.id } })).details;
    assert.deepEqual(retained, { ...previousDetails, ...legacyDetails, category: "Editorial category",
      tags: ["operations", "automation"], authorName: "Editorial author", image: "/images/test-cover.png" });
    for (const [key, value] of Object.entries(legacyDetails)) assert.deepEqual(retained[key], value);
    assert.equal(retained.category, "Editorial category"); assert.deepEqual(retained.tags, ["operations", "automation"]);
    assert.equal(retained.authorName, "Editorial author"); assert.equal(retained.image, "/images/test-cover.png");
    saved = await savePortfolioAction({ message: "" }, form({ id: saved.id, version: saved.version, slug, status: "REVIEW" })); assert.equal(saved.success, true);
    assert.equal((await savePortfolioAction({ message: "" }, form({ id: saved.id, version: saved.version, slug, status: "PUBLISHED" }))).success, undefined);
    await assert.rejects(() => portfolioLifecycleAction({ message: "" }, lifecycle(saved.id, saved.version, "archive")), /Unauthorized/);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const published = await savePortfolioAction({ message: "" }, form({ id: saved.id, version: saved.version, slug, status: "PUBLISHED" })); assert.equal(published.success, true);
    assert.equal((await savePortfolioAction({ message: "" }, form({ id: saved.id, version: saved.version, slug, status: "PUBLISHED" }))).success, undefined);
    const archived = await portfolioLifecycleAction({ message: "" }, lifecycle(published.id, published.version, "archive")); assert.equal(archived.success, true);
    const restored = await portfolioLifecycleAction({ message: "" }, lifecycle(archived.id, archived.version, "restore")); assert.equal(restored.success, true);
    assert.equal((await db.contentEntry.findUniqueOrThrow({ where: { id: restored.id } })).status, "DRAFT");
    assert.equal((await portfolioLifecycleAction({ message: "" }, lifecycle("1", 1, "restore"))).success, undefined);
    const schedule = form(); schedule.set("publishedAt", "2030-01-01T09:30");
    assert.equal(parseContentForm(schedule, true).publishedAt, "2030-01-01T09:30:00.000Z");
  } finally {
    globalThis.__phase2TestCookie = undefined;
    await db.auditEvent.deleteMany({ where: { recordId: { in: ids } } });
    await db.portfolioRoute.deleteMany({ where: { contentId: { in: ids } } });
    await db.contentEntry.deleteMany({ where: { id: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
