-- Phase 3: customer booking requests and admin calendar.
-- Existing Inquiry/CabinInquiry tables are extended so prior data is preserved.
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED');

ALTER TABLE "Inquiry"
  ADD COLUMN "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "customer_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customer_email" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customer_phone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "notes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Inquiry_status_created_at_idx" ON "Inquiry"("status", "created_at");
CREATE INDEX "CabinInquiry_cabinId_startDate_endDate_idx" ON "CabinInquiry"("cabinId", "startDate", "endDate");
