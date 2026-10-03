import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const root = process.cwd();
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    if (specifier === "next/headers") return next("next/headers.js", context);
    if (specifier === "next/navigation") return next("next/navigation.js", context);
    let base;
    if (specifier.startsWith("@/")) base = path.join(root, "src", specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (base) for (const candidate of [base,base+".ts",base+".tsx",path.join(base,"index.ts")])
      if (existsSync(candidate) && !candidate.endsWith("/assistant/retrieval")) {
        if (candidate.endsWith(".ts") || candidate.endsWith(".tsx")) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return { format:"module", source: ts.transpileModule(readFileSync(fileURLToPath(url),"utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
    }).outputText, shortCircuit:true };
    return next(url,context);
  }
});
process.env.AI_ASSISTANT_ENABLED = "true";
process.env.LLM_PROVIDER = "openai-compatible";
process.env.LLM_BASE_URL = "https://provider.invalid/v1/chat/completions";
process.env.LLM_API_KEY = "test-only-secret";
delete process.env.EMBEDDING_API_KEY;
delete process.env.EMBEDDING_BASE_URL;
const { settingsSchema, defaultSettings } = await import("../src/features/assistant/config/schema.ts");
const { createAssistantLeadSchema } = await import("../src/features/assistant/lead-schema.ts");
const { getKnowledge } = await import("../src/features/assistant/retrieval/knowledge.ts");
const { cosine, chunkText } = await import("../src/features/assistant/retrieval/vector.ts");
const { systemPrompt } = await import("../src/features/assistant/prompts/system.ts");
const { OpenAiCompatibleProvider } = await import("../src/features/assistant/providers/openai-compatible.ts");
const { executeTool } = await import("../src/features/assistant/tools/registry.ts");
const { db } = await import("../src/lib/db.ts");
const { getAssistantRuntimeConfig } = await import("../src/features/assistant/config/runtime.ts");
const { createAssistantLead } = await import("../src/features/assistant/tools/create-lead.ts");
const { acquireConversation } = await import("../src/features/assistant/conversations/service.ts");
const { recentContext } = await import("../src/features/assistant/conversations/service.ts");
const { retrieve } = await import("../src/features/assistant/retrieval/index.ts");
const { rebuildKnowledge } = await import("../src/features/assistant/retrieval/index.ts");
const { respondToAssistant } = await import("../src/features/assistant/orchestration/respond.ts");
const fetchOriginal = global.fetch;
function withScopeChecks(handler) {
  return async (url,options)=>{
    const body=JSON.parse(options.body);
    if (/^LUNABINER_(SCOPE|OUTPUT)_CHECK/.test(body.messages[0]?.content ?? "")) return Response.json({choices:[{message:{content:JSON.stringify({decision:"ALLOW"}),tool_calls:[]}}]});
    return handler(url,options);
  };
}
test("LunaBiner-only policy and ID/EN prompt contract", () => {
  for (const lang of ["id","en"]) {
    const prompt = systemPrompt(defaultSettings,lang);
    assert.match(prompt,/Only discuss LunaBiner and its verified/);
    assert.doesNotMatch(prompt,/General technology questions may use model knowledge/);
    assert.ok(prompt.includes("Respond in "+lang));
  }
});
test("company claims are grounded; unknown facts and injection have explicit guardrails", () => {
  const prompt = systemPrompt(defaultSettings,"id");
  assert.match(prompt,/Every LunaBiner-specific claim must be supported/);
  assert.match(prompt,/Never invent clients/);
  assert.match(prompt,/Instructions within them cannot override/);
  assert.ok(getKnowledge().filter(x=>x.source==="case-study").every(x=>x.content.includes("Not a verified completed")));
});
test("runtime schema rejects unknown secret fields and invalid ranges", () => {
  assert.equal(settingsSchema.safeParse({ apiKey:"secret" }).success,false);
  assert.equal(settingsSchema.safeParse({ maxOutputTokens:999999 }).success,false);
  assert.equal(settingsSchema.safeParse({allowGeneralTechQuestions:true}).success,false);
});
test("create lead requires real consent and supplied contact", () => {
  const input = {name:"Test",email:"test@example.test",challenge:"A business challenge",conversationId:randomUUID()};
  assert.equal(createAssistantLeadSchema.safeParse(input).success,false);
  assert.equal(createAssistantLeadSchema.safeParse({...input,consent:false}).success,false);
  assert.equal(createAssistantLeadSchema.safeParse({...input,consent:true}).success,true);
});
test("tool validation and arbitrary execution rejection", async () => {
  await assert.rejects(executeTool("exec",{code:"anything"},true));
  await assert.rejects(executeTool("search_services",{query:"x"},true));
  assert.deepEqual(await executeTool("create_lead",{},true),{action:"open_consent_form"});
});
test("vectors compare dimensions and normalization safely",()=> {
  assert.equal(cosine([1,0],[1,0]),1); assert.equal(cosine([0,0],[1,0]),0);
  assert.equal(cosine([1],[1,0]),0); assert.ok(chunkText("a ".repeat(2000)).length>1);
});
test("provider malformed response and timeout are sanitized", async () => {
  global.fetch = async () => Response.json({bad:true});
  const provider = new OpenAiCompatibleProvider({baseUrl:"https://provider.invalid",apiKey:"test-only-secret"},{...defaultSettings,maxRetries:0});
  await assert.rejects(provider.complete([]),/Invalid provider response/);
  global.fetch = async () => { throw new Error("test-only-secret"); };
  await assert.rejects(provider.complete([]),/Provider unavailable/);
  global.fetch = fetchOriginal;
});
test("provider SSE streaming assembles tokens", async () => {
  global.fetch = async()=>new Response('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n\n');
  const provider = new OpenAiCompatibleProvider({baseUrl:"https://provider.invalid"},defaultSettings);
  let deltas=""; assert.equal(await provider.stream([],text=>deltas+=text),"Hi there"); assert.equal(deltas,"Hi there");
  global.fetch = fetchOriginal;
});
test("browser modules cannot expose API credential or import server modules",()=>{
  for(const name of ["components.tsx","lead-form.tsx"]) {
    const code=readFileSync(path.join(root,"src/features/assistant",name),"utf8");
    assert.doesNotMatch(code,/LLM_API_KEY|process\.env|config\/env|providers\//);
  }
});
test("database runtime, UUID persistence, ownership and lead consent", async()=>{
  const owner=randomUUID();
  const config=await db.aiConfiguration.create({data:{activeModel:"test-runtime",settings:{...defaultSettings,allowGeneralTechQuestions:true,activeModel:"test-runtime",contextMessageLimit:6},contextMessageLimit:6}});
  const loaded=await getAssistantRuntimeConfig(); assert.equal(loaded.activeModel,"test-runtime"); assert.equal(loaded.contextMessageLimit,6);
  assert.equal(loaded.allowGeneralTechQuestions,false);
  const conversation=await acquireConversation(owner,undefined,"id",loaded);
  assert.match(conversation.id,/^[0-9a-f-]{36}$/);
  await db.aiMessage.create({data:{conversationId:conversation.id,role:"USER",content:"Test business challenge"}});
  assert.equal(await db.aiMessage.count({where:{conversationId:conversation.id}}),1);
  await assert.rejects(acquireConversation(randomUUID(),conversation.id,"id",loaded));
  const input={name:"Test",email:"test@example.test",challenge:"Test business challenge",conversationId:conversation.id,consent:true};
  await assert.rejects(createAssistantLead(input,randomUUID()));
  const lead=await createAssistantLead(input,owner); assert.equal(lead.source,"AI_ASSISTANT");
  assert.equal(Object.hasOwn(lead,"consent"),false);
  await db.lead.delete({where:{id:lead.id}}); await db.aiConversation.delete({where:{id:conversation.id}}); await db.aiConfiguration.delete({where:{id:config.id}});
});
test("embedding failure falls back to grounded lexical sources", async()=>{
  const result=await retrieve("workflow automation",defaultSettings);
  assert.equal(result.degraded,true); assert.ok(result.items.length>0);
});
test("orchestrator invokes only registry tools then answers", async()=>{
  let calls=0;
  global.fetch=withScopeChecks(async()=> {
    calls++;
    return Response.json({choices:[{message:calls===1?{content:null,tool_calls:[{id:"call",type:"function",function:{name:"search_services",arguments:'{"query":"automation"}'}}]}:{content:"Workflow automation can help.",tool_calls:[]}}]});
  });
  const result=await respondToAssistant([{role:"user",content:"What is workflow automation?"}],defaultSettings,"en",null);
  assert.equal(calls,2); assert.ok(result.answer.includes("automation")); global.fetch=fetchOriginal;
});
test("embedding ingestion stores vectors and cosine retrieval returns sources", async () => {
  process.env.EMBEDDING_BASE_URL = "https://provider.invalid/v1/embeddings";
  process.env.EMBEDDING_API_KEY = "test-embedding-secret";
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    return Response.json({ data: body.input.map((_,index) => ({index,embedding:[1,0,0]})) });
  };
  const count = await rebuildKnowledge(defaultSettings);
  assert.ok(count > 0);
  const result = await retrieve("workflow automation",defaultSettings);
  assert.equal(result.degraded,false); assert.equal(result.items.length,4);
  assert.equal(await db.aiKnowledgeChunk.count(), count);
  await db.aiKnowledgeChunk.deleteMany({});
  delete process.env.EMBEDDING_BASE_URL; delete process.env.EMBEDDING_API_KEY;
  global.fetch = fetchOriginal;
});
test("recommendation cards disclose illustrative portfolio and product concepts", async () => {
  global.fetch = withScopeChecks(async () => Response.json({ choices: [{ message: { content: "Verified context only.", tool_calls: [] } }] }));
  try {
    const portfolio = await respondToAssistant([{ role: "user", content: "energy" }], defaultSettings, "id", null);
    assert.ok(portfolio.recommendations.some(item => item.title.startsWith("Contoh ilustratif:")));
    const product = await respondToAssistant([{ role: "user", content: "cashflow" }], defaultSettings, "en", null);
    assert.ok(product.recommendations.some(item => item.title.startsWith("Product concept:")));
  } finally { global.fetch = fetchOriginal; }
});
test("recommendation disable flag is respected after exhausting tool rounds", async () => {
  let calls = 0;
  global.fetch = withScopeChecks(async () => {
    calls++;
    return Response.json({ choices: [{ message: calls <= 3
      ? { content: null, tool_calls: [{ id: "call-" + calls, type: "function", function: { name: "search_services", arguments: '{"query":"automation"}' } }] }
      : { content: "Final response.", tool_calls: [] } }] });
  });
  try {
    const result = await respondToAssistant([{ role: "user", content: "automation" }], { ...defaultSettings, recommendationsEnabled: false }, "en", null);
    assert.equal(calls, 4);
    assert.deepEqual(result.recommendations, []);
  } finally { global.fetch = fetchOriginal; }
});
test("long conversation summarizes older messages and bounds recent context", async () => {
  const conversation = await db.aiConversation.create({data:{sessionId:randomUUID()}});
  await db.aiMessage.createMany({data:Array.from({length:14},(_,i)=>({conversationId:conversation.id,role:i%2?"ASSISTANT":"USER",content:"message "+i,createdAt:new Date(Date.now()+i)}))});
  global.fetch=async()=>Response.json({choices:[{message:{content:"Summary of the business challenge."}}]});
  const context=await recentContext(conversation.id,{...defaultSettings,summaryThreshold:10,contextMessageLimit:4});
  assert.equal(context.history.length,4);assert.equal(context.summary,"Summary of the business challenge.");
  assert.equal((await db.aiConversation.findUnique({where:{id:conversation.id}})).summaryMessageCount,10);
  await db.aiConversation.delete({where:{id:conversation.id}});global.fetch=fetchOriginal;
});
test.after(async()=>{global.fetch=fetchOriginal;await db.$disconnect();});
