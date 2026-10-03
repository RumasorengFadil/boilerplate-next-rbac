CREATE TYPE "ContentKind" AS ENUM ('ARTICLE', 'CASE_STUDY', 'PRODUCT');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
CREATE TABLE "ContentEntry" (
  "id" UUID NOT NULL,
  "kind" "ContentKind" NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "translations" JSONB NOT NULL,
  "details" JSONB NOT NULL,
  "authorId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentEntry_kind_slug_key" ON "ContentEntry"("kind", "slug");
CREATE INDEX "ContentEntry_kind_status_publishedAt_idx" ON "ContentEntry"("kind", "status", "publishedAt");
ALTER TABLE "ContentEntry" ADD CONSTRAINT "ContentEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
