ALTER TABLE "Lead" ADD COLUMN "scoreDetails" JSONB,
ADD COLUMN "companySize" TEXT,
ADD COLUMN "targetDate" TIMESTAMP(3);

CREATE TABLE "LeadScoreConfig" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'global',
  "rules" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadScoreConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadScoreConfig_global_key" CHECK ("key" = 'global'),
  CONSTRAINT "LeadScoreConfig_version_positive" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "LeadScoreConfig_key_key" ON "LeadScoreConfig"("key");
