import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const base = "http://127.0.0.1:55442";
const entries = [], users = [];
let leadId;
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "55442"], { env: { ...process.env, AI_ASSISTANT_ENABLED: "false" }, stdio: "ignore" });
try {
  for (let i=0;i<60;i++) { try { await fetch(base + "/id"); break; } catch { await new Promise(resolve=>setTimeout(resolve,500)); } }
  const slug = "http-test-" + randomUUID();
  for (const status of ["DRAFT", "PUBLISHED"]) {
    const translation = { title: "HTTP CMS " + status, excerpt: "Synthetic acceptance test excerpt", body: status === "DRAFT" ? "PRIVATE DRAFT NEVER PUBLIC" : "PUBLIC VERIFIED EDITORIAL BODY", seoTitle: "", seoDescription: "" };
    const entry = await db.contentEntry.create({ data: { kind: "ARTICLE", slug: slug + "-" + status.toLowerCase(), status, translations: { id: translation, en: translation }, details: {}, publishedAt: status === "PUBLISHED" ? new Date() : null } }); entries.push(entry.id);
  }
  const list = await (await fetch(base+"/id/insights")).text();
  assert.ok(list.includes("HTTP CMS PUBLISHED")); assert.ok(!list.includes("HTTP CMS DRAFT"));
  assert.equal((await fetch(base+"/id/insights/"+slug+"-draft")).status,404);
  const article = await (await fetch(base+"/en/insights/"+slug+"-published")).text();
  assert.ok(article.includes("PUBLIC VERIFIED EDITORIAL BODY"));
  const lead = await db.lead.create({ data: { name: "HTTP lead fixture", email: randomUUID()+"@example.test", challenge: "Synthetic isolated lead detail", source: "CONTACT" } }); leadId=lead.id;
  for (const role of ["ADMIN", "CONTENT_EDITOR", "SALES", "MEMBER"]) {
    const token = randomUUID();
    const user = await db.user.create({ data: { name: "CMS HTTP " + role, email: token+"@example.test", passwordHash: "synthetic-test-only", role } }); users.push(user.id);
    await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now()+60000) } });
    const response = await fetch(base+"/dashboard/content/new",{headers:{Cookie:"session="+token},redirect:"manual"});
    assert.equal(response.status,["ADMIN","CONTENT_EDITOR"].includes(role)?200:307);
    const detail = await fetch(base+"/dashboard/leads/"+leadId,{headers:{Cookie:"session="+token},redirect:"manual"});
    assert.equal(detail.status,["ADMIN","SALES"].includes(role)?200:307);
    if (detail.status===200) assert.ok((await detail.text()).includes("Synthetic isolated lead detail"));
    if(response.status===200) { const html=await response.text(); assert.ok(html.includes('name="id.title"'));assert.ok(html.includes('name="en.body"'));assert.equal(/<option[^>]*>PUBLISHED<\/option>/.test(html),role==="ADMIN"); }
  }
  console.log("PASS: CMS publication visibility, private draft 404, ID/EN article body, editor fields, lead detail and HTTP role authorization.");
} finally {
  app.kill("SIGTERM");
  if(leadId)await db.lead.delete({where:{id:leadId}});
  await db.contentEntry.deleteMany({ where: { id: { in: entries } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
