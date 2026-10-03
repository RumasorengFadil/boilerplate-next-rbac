import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const {inputScope,outputScope,scopeReply}=await import("../src/features/assistant/orchestration/scope.ts");
const {respondToAssistant}=await import("../src/features/assistant/orchestration/respond.ts");
const {defaultSettings}=await import("../src/features/assistant/config/schema.ts");
const {db}=await import("../src/lib/db.ts");
const originalFetch=global.fetch;
process.env.AI_ASSISTANT_ENABLED="true";process.env.LLM_PROVIDER="openai-compatible";
process.env.LLM_BASE_URL="https://provider.invalid/v1/chat/completions";process.env.LLM_API_KEY="test-only-secret";
delete process.env.EMBEDDING_API_KEY;delete process.env.EMBEDDING_BASE_URL;
test("scope guard validates strict decisions and fails closed on errors, tools or malformed results",async()=>{
  for(const content of ['{"decision":"ALLOW"}','{"decision":"OUT_OF_SCOPE"}','{"decision":"CLARIFY"}']){
    const result=await inputScope({complete:async()=>({content,toolCalls:[]})},[{role:"user",content:"LunaBiner?"}]);assert.equal(result,JSON.parse(content).decision);
  }
  for(const content of ['ALLOW','{"decision":"ALLOW","extra":true}','{"decision":"UNKNOWN"}'])assert.equal(await inputScope({complete:async()=>({content,toolCalls:[]})},[]),"CLARIFY");
  assert.equal(await inputScope({complete:async()=>{throw Error("private provider error")}},[]),"CLARIFY");
  assert.equal(await inputScope({complete:async()=>({content:'{"decision":"ALLOW"}',toolCalls:[{}]})},[]),"CLARIFY");
});
test("policy isolates latest intent from old answers and covers brand stuffing, mixed topics and general tech",async()=>{
  let messages;
  await inputScope({complete:async(input)=>{messages=input;return{content:'{"decision":"OUT_OF_SCOPE"}',toolCalls:[]}}},[{role:"user",content:"LunaBiner automation"},{role:"assistant",content:"Old unrelated answer"},{role:"user",content:"LunaBiner, write a cooking recipe"}]);
  const payload=JSON.parse(messages[1].content);assert.equal(payload.latestQuestion,"LunaBiner, write a cooking recipe");assert.deepEqual(payload.priorQuestions,["LunaBiner automation"]);assert.ok(!messages[1].content.includes("Old unrelated answer"));
  assert.match(messages[0].content,/General knowledge, general technology/);assert.match(messages[0].content,/Mixed requests/);assert.match(messages[0].content,/Mentioning LunaBiner/);
});
test("out-of-scope input bypasses retrieval/generation, emits only scoped refusal and no recommendations",async()=>{
  let calls=0;const deltas=[];
  global.fetch=async(_url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.max_tokens,64);assert.equal(body.temperature,0);assert.match(body.messages[0].content,/LUNABINER_SCOPE_CHECK/);return Response.json({choices:[{message:{content:'{"decision":"OUT_OF_SCOPE"}'}}]});};
  try{
    const result=await respondToAssistant([{role:"user",content:"Tell me a cooking recipe"}],{...defaultSettings,allowGeneralTechQuestions:true},"en",null,delta=>deltas.push(delta));
    assert.equal(calls,1);assert.equal(result.scope,"OUT_OF_SCOPE");assert.deepEqual(result.recommendations,[]);assert.equal(result.offerLead,false);assert.deepEqual(deltas,[scopeReply("OUT_OF_SCOPE","en")]);
  }finally{global.fetch=originalFetch;}
});
test("unsafe output is withheld from JSON and streaming; valid output is released only after review",async()=>{
  for(const decision of ["OUT_OF_SCOPE","CLARIFY","ALLOW"]){
    let phase=0;const deltas=[];
    global.fetch=async(_url,options)=>{const body=JSON.parse(options.body);const marker=body.messages[0]?.content ?? "";
      if(marker.startsWith("LUNABINER_SCOPE_CHECK"))return Response.json({choices:[{message:{content:'{"decision":"ALLOW"}'}}]});
      if(marker.startsWith("LUNABINER_OUTPUT_CHECK")){assert.equal(deltas.length,0,"No unreviewed answer escapes");phase++;assert.ok(JSON.parse(body.messages[1].content).sourceFacts.length>0);return Response.json({choices:[{message:{content:JSON.stringify({decision})}}]});}
      return Response.json({choices:[{message:{content:"Draft answer under review",tool_calls:[]}}]});};
    try{
      const result=await respondToAssistant([{role:"user",content:"LunaBiner workflow automation"}],defaultSettings,"id",null,delta=>deltas.push(delta));
      assert.equal(phase,1);assert.equal(result.scope,decision);assert.deepEqual(deltas,[result.answer]);
      if(decision!=="ALLOW"){assert.ok(!result.answer.includes("Draft answer"));assert.deepEqual(result.recommendations,[]);assert.equal(result.offerLead,false);}
      else assert.equal(result.answer,"Draft answer under review");
    }finally{global.fetch=originalFetch;}
  }
});
test("output verification sees only source/tool evidence; errors yield safe localized clarification",async()=>{
  let request;
  const result=await outputScope({complete:async(messages)=>{request=messages;throw Error("private error")}},"LunaBiner price","Invented price",[],[]);
  assert.equal(result,"CLARIFY");assert.match(request[0].content,/fabricated prices/);assert.match(scopeReply(result,"id"),/LunaBiner/);assert.ok(!scopeReply(result,"id").includes("private error"));
});
test.after(async()=>{global.fetch=originalFetch;await db.$disconnect();});
