import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
const { db } = await import("../src/lib/db.ts");
const { saveContent, publishedContent } = await import("../src/features/cms/service.ts");

test("CMS server permissions, publication, optimistic locking and audit are transactional", async () => {
  const userIds = [], contentIds = [], tokens = {};
  try {
    for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES"]) {
      const token = randomUUID();
      const user = await db.user.create({ data: { email: token + "@example.test", name: "Test " + role, passwordHash: "synthetic-test-only", role } });
      userIds.push(user.id); tokens[role] = token;
      await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60000) } });
    }
    const translation = { title: "Publication test", excerpt: "Verified test description", body: "This is an isolated test article, not real company content." };
    const input = { kind: "ARTICLE", slug: "test-" + randomUUID(), status: "DRAFT", translations: { id: translation, en: translation }, details: {} };
    globalThis.__phase2TestCookie = tokens.SALES;
    await assert.rejects(() => saveContent(input), /Unauthorized/);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    const draft = await saveContent(input); contentIds.push(draft.id);
    assert.match(draft.id, /^[0-9a-f-]{36}$/);
    assert.ok(!(await publishedContent("ARTICLE")).some(entry => entry.id === draft.id));
    const review = await saveContent({ ...input, id: draft.id, version: draft.version, status: "REVIEW" });
    await assert.rejects(() => saveContent({ ...input, id: draft.id, version: review.version, status: "PUBLISHED" }), /permission/);
    globalThis.__phase2TestCookie = tokens.ADMIN;
    const published = await saveContent({ ...input, id: draft.id, version: review.version, status: "PUBLISHED" });
    assert.ok((await publishedContent("ARTICLE")).some(entry => entry.id === published.id));
    await assert.rejects(() => saveContent({ ...input, id: draft.id, version: review.version, status: "PUBLISHED" }), /changed/);
    globalThis.__phase2TestCookie = tokens.CONTENT_EDITOR;
    await assert.rejects(() => saveContent({ ...input, id: draft.id, version: published.version, status: "DRAFT" }), /permission/);
    assert.equal(await db.auditEvent.count({ where: { recordId: draft.id } }), 3);
  } finally {
    globalThis.__phase2TestCookie = undefined;
    await db.auditEvent.deleteMany({ where: { recordId: { in: contentIds } } });
    await db.contentEntry.deleteMany({ where: { id: { in: contentIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
