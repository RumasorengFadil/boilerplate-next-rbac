CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "AiConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "AiConfiguration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "activeModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2, "maxOutputTokens" INTEGER NOT NULL DEFAULT 500,
  "contextMessageLimit" INTEGER NOT NULL DEFAULT 8, "ragEnabled" BOOLEAN NOT NULL DEFAULT true,
  "systemPrompt" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AiConversation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "sessionId" UUID NOT NULL, "language" TEXT NOT NULL DEFAULT 'id',
  "title" TEXT, "summary" TEXT, "status" "AiConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AiMessage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "conversationId" UUID NOT NULL, "role" "AiMessageRole" NOT NULL,
  "content" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiConversation_sessionId_updatedAt_idx" ON "AiConversation"("sessionId", "updatedAt");
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');
CREATE TABLE "Lead" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" TEXT NOT NULL, "company" TEXT, "email" TEXT NOT NULL, "phone" TEXT, "serviceInterest" TEXT, "challenge" TEXT NOT NULL, "source" TEXT NOT NULL, "language" TEXT NOT NULL DEFAULT 'id', "status" "LeadStatus" NOT NULL DEFAULT 'NEW', "score" INTEGER NOT NULL DEFAULT 0, "conversationId" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
