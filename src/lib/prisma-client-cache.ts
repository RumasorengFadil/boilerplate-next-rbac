type Disconnectable = { $disconnect(): Promise<void> };
export type PrismaCache<T> = { prisma?: T; prismaSchema?: string };

export function cachedPrismaClient<T extends Disconnectable>(cache: PrismaCache<T>, schema: string, create: () => T): T {
  if (cache.prisma && cache.prismaSchema === schema) return cache.prisma;
  const previous = cache.prisma;
  const client = create();
  cache.prisma = client;
  cache.prismaSchema = schema;
  // Schema regeneration must not keep the old pool alive across hot reloads.
  if (previous) void previous.$disconnect().catch(() => undefined);
  return client;
}
