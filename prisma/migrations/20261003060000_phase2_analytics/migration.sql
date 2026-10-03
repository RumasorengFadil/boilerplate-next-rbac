ALTER TABLE "Lead" ADD COLUMN "visitorId" UUID;
CREATE TYPE "AnalyticsKind" AS ENUM ('PAGE_VIEW', 'CTA_CLICK', 'WHATSAPP_CLICK', 'AI_OPEN');
CREATE TABLE "AnalyticsEvent" (
  "id" UUID NOT NULL, "visitorId" UUID NOT NULL, "sessionId" UUID NOT NULL,
  "kind" "AnalyticsKind" NOT NULL, "path" TEXT NOT NULL, "target" TEXT,
  "language" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnalyticsEvent_createdAt_kind_idx" ON "AnalyticsEvent"("createdAt", "kind");
CREATE INDEX "AnalyticsEvent_visitorId_createdAt_idx" ON "AnalyticsEvent"("visitorId", "createdAt");
CREATE INDEX "AnalyticsEvent_path_kind_createdAt_idx" ON "AnalyticsEvent"("path", "kind", "createdAt");
