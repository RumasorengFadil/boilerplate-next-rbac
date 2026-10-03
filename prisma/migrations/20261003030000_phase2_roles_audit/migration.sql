ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'CONTENT_EDITOR';
ALTER TYPE "Role" ADD VALUE 'MARKETING';
ALTER TYPE "Role" ADD VALUE 'SALES';

CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_module_recordId_createdAt_idx" ON "AuditEvent"("module", "recordId", "createdAt");
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
