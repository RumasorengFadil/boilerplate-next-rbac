import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const {cachedPrismaClient}=await import("../src/lib/prisma-client-cache.ts");
test("matching schema reuses development client without opening another pool",()=>{
  const client={$disconnect:async()=>{throw Error("Must not disconnect")}};
  assert.equal(cachedPrismaClient({prisma:client,prismaSchema:"current"},"current",()=>{throw Error("Must not create")}),client);
});
test("legacy or changed schema replaces cached instance and releases old pool",async()=>{
  for(const oldSchema of [undefined,"old"]){
    let disconnected=0;
    const old={$disconnect:async()=>{disconnected++;}};
    const next={consultationBooking:{findMany:()=>[]},$disconnect:async()=>{}};
    const cache={prisma:old,prismaSchema:oldSchema};
    assert.equal(cachedPrismaClient(cache,"new",()=>next),next);
    assert.equal(disconnected,1);assert.equal(cache.prismaSchema,"new");
    assert.equal(typeof cache.prisma.consultationBooking.findMany,"function");
  }
});
test("db bootstrap replaces a pre-scheduling global singleton with generated delegates",async()=>{
  const priorMode=process.env.NODE_ENV;process.env.NODE_ENV="development";
  let disconnected=0;
  globalThis.prisma={$disconnect:async()=>{disconnected++;}};delete globalThis.prismaSchema;
  const {db}=await import("../src/lib/db.ts");
  try{
    assert.equal(disconnected,1);
    assert.equal(typeof db.consultationBooking.findMany,"function");
    assert.equal(typeof db.consultationSlot.findMany,"function");
    assert.equal(globalThis.prisma,db);
  }finally{await db.$disconnect();delete globalThis.prisma;delete globalThis.prismaSchema;if(priorMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=priorMode;}
});
