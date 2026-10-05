import nextEnv from "@next/env";
import { seedProductExamples } from "../src/features/products/seed.ts";

nextEnv.loadEnvConfig(process.cwd());
const { PrismaClient } = await import("@prisma/client");
const client = new PrismaClient();
try {
  const result = await seedProductExamples(client);
  console.log(`Product concepts: ${result.created} created, ${result.skipped} preserved. Readiness COMING_SOON is separate from publication.`);
} catch {
  console.error("Product seed failed. Check migration, database access and reserved UUID/slug conflicts. No partial seed is committed.");
  process.exitCode = 1;
} finally { await client.$disconnect(); }
