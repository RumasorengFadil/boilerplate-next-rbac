CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TABLE "ConsultationSlot" (
  "id" UUID NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "service" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsultationSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsultationSlot_positive_duration" CHECK ("endsAt" > "startsAt")
);
CREATE UNIQUE INDEX "ConsultationSlot_startsAt_key" ON "ConsultationSlot"("startsAt");
CREATE INDEX "ConsultationSlot_enabled_startsAt_idx" ON "ConsultationSlot"("enabled", "startsAt");
ALTER TABLE "ConsultationSlot" ADD CONSTRAINT "ConsultationSlot_no_overlap"
EXCLUDE USING gist (tsrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("enabled");
CREATE TABLE "ConsultationBooking" (
  "id" UUID NOT NULL,
  "slotId" UUID NOT NULL,
  "leadId" UUID NOT NULL,
  "timezone" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "tokenHash" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsultationBooking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsultationBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ConsultationSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConsultationBooking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConsultationBooking_tokenHash_key" ON "ConsultationBooking"("tokenHash");
CREATE UNIQUE INDEX "ConsultationBooking_active_slot" ON "ConsultationBooking"("slotId") WHERE "status" = 'CONFIRMED';
CREATE INDEX "ConsultationBooking_status_createdAt_idx" ON "ConsultationBooking"("status", "createdAt");
CREATE INDEX "ConsultationBooking_leadId_idx" ON "ConsultationBooking"("leadId");
