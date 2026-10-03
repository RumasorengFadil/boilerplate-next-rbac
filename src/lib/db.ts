import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { cachedPrismaClient, type PrismaCache } from "./prisma-client-cache";

const globalForPrisma = globalThis as unknown as PrismaCache<PrismaClient>;
const schema = createHash("sha256").update(JSON.stringify(Prisma.dmmf.datamodel)).digest("hex");
export const db = process.env.NODE_ENV === "production"
  ? new PrismaClient()
  : cachedPrismaClient(globalForPrisma, schema, () => new PrismaClient());
