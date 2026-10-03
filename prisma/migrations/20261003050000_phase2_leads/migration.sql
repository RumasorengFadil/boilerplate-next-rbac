ALTER TABLE "Lead" ADD COLUMN "budget" TEXT, ADD COLUMN "timeline" TEXT, ADD COLUMN "sourcePage" TEXT, ADD COLUMN "ownerId" TEXT, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "Lead_ownerId_status_idx" ON "Lead"("ownerId", "status");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "LeadNote" (
  "id" UUID NOT NULL, "leadId" UUID NOT NULL, "authorId" TEXT, "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeadActivity" (
  "id" UUID NOT NULL, "leadId" UUID NOT NULL, "actorId" TEXT, "action" TEXT NOT NULL, "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeadNote_leadId_createdAt_idx" ON "LeadNote"("leadId", "createdAt");
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
