import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
const db = new PrismaClient();
const base = "http://127.0.0.1:55441";
const provider = createServer(async (request,response) => {
  let body=""; for await(const chunk of request) body+=chunk;
  const input=JSON.parse(body);
  if(input.stream) {response.writeHead(200,{"Content-Type":"text/event-stream"});response.end('data: {"choices":[{"delta":{"content":"Test response"}}]}\n\ndata: [DONE]\n\n');}
  else {response.writeHead(200,{"Content-Type":"application/json"});response.end(JSON.stringify({choices:[{message:{content:"Test response",tool_calls:[]}}]}));}
});
await new Promise(resolve=>provider.listen(55440,"127.0.0.1",resolve));
const app=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","55441"], {
  env:{...process.env,AI_ASSISTANT_ENABLED:"true",LLM_PROVIDER:"openai-compatible",LLM_BASE_URL:"http://127.0.0.1:55440/v1/chat/completions",LLM_API_KEY:"test-only-secret"},
  stdio:["ignore","pipe","pipe"],
});
let appLog=""; app.stdout.on("data",x=>appLog+=x);app.stderr.on("data",x=>appLog+=x);
let configId;let conversationId;let leadId;const userIds=[];
try {
  for(let i=0;i<60;i++){try{await fetch(base+"/id");break;}catch{await new Promise(r=>setTimeout(r,500));}}
  async function post(path,body,cookie="",origin=base) {return fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});}
  const blocked=await post("/api/assistant/chat",{prompt:"hello world"},"","https://attacker.invalid");assert.equal(blocked.status,403);
  const malformed=await post("/api/assistant/chat",{prompt:"x"});assert.equal(malformed.status,400);
  const chat=await post("/api/assistant/chat",{prompt:"What is workflow automation?",language:"en"});
  assert.equal(chat.status,200);
  const result=await chat.json();conversationId=result.conversationId;assert.equal(result.answer,"Test response");
  const cookie=chat.headers.get("set-cookie").split(";")[0];
  const history=await fetch(base+"/api/assistant/conversations/"+conversationId,{headers:{Cookie:cookie}});
  assert.equal(history.status,200); assert.equal((await history.json()).messages.length,2);
  assert.equal((await fetch(base+"/api/assistant/conversations/"+conversationId)).status,404);
  const unconsented=await post("/api/assistant/leads",{name:"Tester",email:"test@example.test",challenge:"Test business challenge",conversationId},cookie);
  assert.equal(unconsented.status,400);
  const lead=await post("/api/assistant/leads",{consent:true,name:"Tester",email:"test@example.test",challenge:"Test business challenge",conversationId},cookie);
  assert.equal(lead.status,200); leadId=(await lead.json()).id;
  const config=await db.aiConfiguration.create({data:{settings:{streamingEnabled:true},updatedBy:"test"}});configId=config.id;
  const stream=await post("/api/assistant/chat",{prompt:"Explain automation for business.",conversationId},cookie);
  assert.match(stream.headers.get("content-type"),/ndjson/);const streamed=await stream.text();assert.ok(streamed.includes('"delta":"Test response"'));assert.ok(streamed.includes('"done":true'));
  assert.ok(!(JSON.stringify(result)+streamed).includes("test-only-secret"));
  for(const role of ["MEMBER","ADMIN"]) {
    const token=randomUUID();
    const user=await db.user.create({data:{name:"AI test "+role,email:token+"@example.test",passwordHash:"test-only",role}});userIds.push(user.id);
    await db.session.create({data:{userId:user.id,tokenHash:createHash("sha256").update(token).digest("hex"),expiresAt:new Date(Date.now()+60000)}});
    const adminPage=await fetch(base+"/dashboard/ai",{headers:{Cookie:"session="+token},redirect:"manual"});
    assert.equal(adminPage.status,role==="ADMIN"?200:307);
  }
  console.log("PASS: origin validation, malformed input, chat, refresh history, session ownership, explicit consent, UUID lead, streaming, secret protection.");
} finally {
  if(leadId)await db.lead.delete({where:{id:leadId}});
  if(conversationId)await db.aiConversation.delete({where:{id:conversationId}});
  if(configId)await db.aiConfiguration.delete({where:{id:configId}});
  for(const id of userIds)await db.user.delete({where:{id}});
  await db.aiRateBucket.deleteMany({});
  app.kill("SIGTERM");provider.close();await db.$disconnect();
}
