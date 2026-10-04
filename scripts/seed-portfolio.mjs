import nextEnv from "@next/env";
import { seedPortfolioExamples } from "../src/features/portfolio/seed.ts";

nextEnv.loadEnvConfig(process.cwd());
// Prisma's module can load .env; load Next's .env.local precedence before importing it.
const { PrismaClient } = await import("@prisma/client");
const client = new PrismaClient();
try {
  const result = await seedPortfolioExamples(client);
  console.log(`Portfolio illustrative examples: ${result.created} created, ${result.skipped} preserved.`);
} catch {
  // Do not print credentials or raw connection errors.
  console.error("Portfolio seed failed. Check migration, database access and reserved slug/UUID/legacy route conflicts. No partial seed is committed.");
  process.exitCode = 1;
} finally { await client.$disconnect(); }
