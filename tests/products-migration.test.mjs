import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import path from "node:path";

const target = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441");
assert.equal(target.username, "portfolio_test"); assert.equal(target.pathname, "/lunabiner_portfolio_test");
const migration = path.resolve("prisma/migrations/20261005010000_product_foundation/migration.sql");

test("product migration backfill is additive; invalid routes/conflicting ownership roll back all DDL", async t => {
  const db = new PrismaClient();
  try {
    assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, "lunabiner_portfolio_test");
    for (const scenario of ["valid", "conflict", "invalid"]) await t.test(scenario, async () => {
      const schema = "product_migration_" + randomUUID().replaceAll("-", "");
      const id = randomUUID(), second = randomUUID();
      await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      try {
        await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."ContentEntry" ("id" UUID PRIMARY KEY, "kind" TEXT NOT NULL, "slug" TEXT NOT NULL)`);
        await db.$executeRawUnsafe(`INSERT INTO "${schema}"."ContentEntry" VALUES ($1::uuid, 'PRODUCT', $2)`, id, scenario === "conflict" ? second : scenario === "invalid" ? "invalid--slug" : "existing-product");
        await db.$executeRawUnsafe(`INSERT INTO "${schema}"."ContentEntry" VALUES ($1::uuid, 'PRODUCT', 'other-product')`, second);
        const result = spawnSync("psql", [process.env.DATABASE_URL, "-X", "-v", "ON_ERROR_STOP=1", "-c", `SET search_path TO "${schema}"`, "-f", migration], { encoding: "utf8" });
        if (result.error) throw result.error;
        assert.equal(result.status === 0, scenario === "valid");
        const [relation] = await db.$queryRaw`SELECT to_regclass(${schema + '."ProductRoute"'})::text AS name`;
        if (scenario === "valid") {
          assert.ok(relation.name);
          const rows = await db.$queryRawUnsafe(`SELECT "value", "contentId" FROM "${schema}"."ProductRoute"`);
          assert.equal(rows.length, 4);
          assert.equal(rows.find(row => row.value === "existing-product").contentId, id);
          assert.equal(rows.find(row => row.value === id).contentId, id);
        } else {
          assert.equal(relation.name, null);
          const [functions] = await db.$queryRaw`SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname=${schema}`;
          assert.equal(functions.count, 0);
        }
        assert.equal((await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${schema}"."ContentEntry"`))[0].count, 2);
      } finally {
        // Only the UUID-named synthetic schema created by this test is removed.
        await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      }
    });
  } finally { await db.$disconnect(); }
});
