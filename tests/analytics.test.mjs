import test from "node:test";
import assert from "node:assert/strict";
import { analyticsInputSchema } from "../src/features/analytics/schema.ts";
const event = { consent: true, kind: "PAGE_VIEW", path: "/id/insights/ai-untuk-operasi-bisnis", language: "id" };
test("analytics requires consent and forbids private/query/PII payloads", () => {
  assert.equal(analyticsInputSchema.safeParse(event).success,true);
  for(const data of [{...event,consent:false},{...event,path:"/dashboard/leads"},{...event,path:"/id/contact?email=private@example.test"},{...event,email:"private@example.test"},{...event,kind:"LEAD_CAPTURED"},{...event,target:"https://external.invalid"}])assert.equal(analyticsInputSchema.safeParse(data).success,false);
});
