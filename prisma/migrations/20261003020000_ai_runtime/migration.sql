ALTER TABLE "AiConfiguration" ADD COLUMN "settings" JSONB, ADD COLUMN "updatedBy" TEXT;
ALTER TABLE "AiConversation" ADD COLUMN "summaryMessageCount" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "userId" TEXT, ADD COLUMN "busyUntil" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE TABLE "AiKnowledgeChunk" ("id" UUID NOT NULL, "sourceKey" TEXT NOT NULL, "source" TEXT NOT NULL, "title" TEXT NOT NULL, "href" TEXT NOT NULL, "content" TEXT NOT NULL, "embedding" JSONB NOT NULL, "embeddingModel" TEXT NOT NULL, "contentHash" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AiKnowledgeChunk_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AiKnowledgeChunk_sourceKey_key" ON "AiKnowledgeChunk"("sourceKey");
CREATE TABLE "AiRateBucket" ("id" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AiRateBucket_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AiRateBucket_expiresAt_idx" ON "AiRateBucket"("expiresAt");
CREATE TABLE "AiAuditEvent" ("id" UUID NOT NULL, "actorId" TEXT, "action" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AiAuditEvent_pkey" PRIMARY KEY ("id"));
