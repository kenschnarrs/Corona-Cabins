-- Google Calendar sync: one admin Google connection (refresh token, chosen
-- calendar) plus the mapping from cabin stays to the Google events created
-- for them, so later status changes update or delete the right events.
CREATE TABLE "CalendarConnection" (
  "id" TEXT NOT NULL,
  "connectedEmail" TEXT NOT NULL DEFAULT '',
  "calendarId" TEXT NOT NULL DEFAULT '',
  "calendarName" TEXT NOT NULL DEFAULT '',
  "refreshToken" TEXT NOT NULL,
  "accessToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingCalendarEvent" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "cabinId" TEXT NOT NULL,
  "googleEventId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingCalendarEvent_inquiryId_cabinId_key" ON "BookingCalendarEvent"("inquiryId", "cabinId");
