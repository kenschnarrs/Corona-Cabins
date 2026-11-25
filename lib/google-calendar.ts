// Server-only Google Calendar sync for confirmed bookings.
//
// Model: a single admin (Ken) connects his Google account with the
// `calendar.events` scope through /admin/calendar. The refresh token lives in
// the CalendarConnection table (never in source). When a booking becomes
// SCHEDULED, one event per cabin stay is created or updated on the configured
// calendar; when a booking leaves the calendar (back to PENDING, or cancelled
// by management or the customer), its events are deleted. Sync failures never
// fail the booking mutation itself - the caller logs and reports the outcome,
// and /admin/calendar offers a manual re-sync.
//
// Time zone: stay dates are stored at the check-in/check-out hours (13:00 /
// 12:00) as if they were local wall time (see parseStayDates). The cabins use
// Eastern, and the Google calendar itself is stuck on America/Chicago because
// Google's admin re-verification gate blocks changing it - so every event
// carries America/New_York explicitly instead of relying on the calendar's
// zone. If the cabin zone ever needs to differ, CABIN_TIME_ZONE is the one
// line to change.
import type { NextApiRequest } from "next";
import prisma from "./prisma";
import type { StoredBookingStatus } from "./booking";

export const CABIN_TIME_ZONE = "America/New_York";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";
const CONNECTION_ID = "primary";

export function calendarCallbackUri(req: NextApiRequest): string {
  if (process.env.GOOGLE_CALENDAR_REDIRECT_URI) return process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  const proto = typeof req.headers["x-forwarded-proto"] === "string" ? req.headers["x-forwarded-proto"] as string : "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${proto}://${host}/api/admin/calendar/callback`;
}

export function buildCalendarConnectUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `openid email ${CALENDAR_SCOPE}`,
    access_type: "offline",
    // consent forces Google to return a refresh token on every connect,
    // including reconnects after a disconnect.
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

function decodeIdTokenEmail(idToken?: string): string {
  if (!idToken) return "";
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : "";
  } catch {
    return "";
  }
}

export async function exchangeCalendarCode(code: string, redirectUri: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ID ?? "",
      client_secret: process.env.GOOGLE_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(`Google refused the connect code (${response.status} ${data.error ?? "unknown"}).`);
  }
  if (!data.refresh_token) {
    throw new Error("Google did not return a refresh token. Reconnect to grant calendar access again.");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    connectedEmail: decodeIdTokenEmail(data.id_token),
  };
}

async function getFreshAccessToken() {
  const connection = await prisma.calendarConnection.findUnique({ where: { id: CONNECTION_ID } });
  if (!connection) return null;
  if (connection.accessToken && connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
    return { token: connection.accessToken, connection };
  }
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ID ?? "",
      client_secret: process.env.GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    }),
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(`Google token refresh failed (${response.status} ${data.error ?? "unknown"}).`);
  }
  const accessTokenExpiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  const updated = await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: { accessToken: data.access_token, accessTokenExpiresAt },
  });
  return { token: data.access_token, connection: updated };
}

async function calendarFetch(path: string, token: string, init: { method: string; body?: unknown }) {
  const response = await fetch(`${CALENDAR_API_URL}${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (response.status === 204) return { status: response.status, data: null };
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

/** Wall-clock reading of a stored stay instant; paired with CABIN_TIME_ZONE on the event. */
function cabinWallTime(date: Date): string {
  return date.toISOString().slice(0, 19);
}

type StayForEvent = {
  cabinId: string;
  startDate: Date;
  endDate: Date;
  cabin: { name: string };
};

type InquiryForEvent = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string;
};

function buildEventBody(inquiry: InquiryForEvent, stay: StayForEvent) {
  const description = [
    `Guest: ${inquiry.customer_name}`,
    `Email: ${inquiry.customer_email}`,
    `Phone: ${inquiry.customer_phone}`,
    `Stay: ${stay.startDate.toISOString().slice(0, 10)} to ${stay.endDate.toISOString().slice(0, 10)} (check-in 1 PM, check-out 12 PM)`,
    inquiry.notes ? `Notes: ${inquiry.notes}` : "",
    `Booking request: ${inquiry.id}`,
    "Created by the Cabañas Corona booking sync. Update it from the admin page, not by hand.",
  ].filter(Boolean).join("\n");
  return {
    summary: `${stay.cabin.name} - ${inquiry.customer_name}`,
    description,
    start: { dateTime: cabinWallTime(stay.startDate), timeZone: CABIN_TIME_ZONE },
    end: { dateTime: cabinWallTime(stay.endDate), timeZone: CABIN_TIME_ZONE },
    extendedProperties: { private: { inquiryId: inquiry.id, cabinId: stay.cabinId } },
  };
}

export type CalendarSyncOutcome = "synced" | "removed" | "not-connected" | "failed";

async function syncConfirmedBooking(inquiryId: string): Promise<CalendarSyncOutcome> {
  const auth = await getFreshAccessToken();
  if (!auth) return "not-connected";
  const { token, connection } = auth;
  if (!connection.calendarId) return "not-connected";
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: { cabins: { include: { cabin: { select: { name: true } } } } },
  });
  if (!inquiry) return "failed";
  const calendarId = encodeURIComponent(connection.calendarId);
  for (const stay of inquiry.cabins) {
    const body = buildEventBody(inquiry, stay);
    const link = await prisma.bookingCalendarEvent.findUnique({
      where: { inquiryId_cabinId: { inquiryId, cabinId: stay.cabinId } },
    });
    if (link) {
      const updated = await calendarFetch(`/calendars/${calendarId}/events/${encodeURIComponent(link.googleEventId)}`, token, { method: "PATCH", body });
      if (updated.status === 404 || updated.status === 410) {
        await prisma.bookingCalendarEvent.delete({ where: { id: link.id } });
      } else if (updated.status >= 200 && updated.status < 300) {
        continue;
      } else {
        throw new Error(`Google event update failed (${updated.status}).`);
      }
    }
    const created = await calendarFetch(`/calendars/${calendarId}/events`, token, { method: "POST", body });
    const eventId = created.data && typeof created.data.id === "string" ? created.data.id : null;
    if (created.status < 200 || created.status >= 300 || !eventId) {
      throw new Error(`Google event create failed (${created.status}).`);
    }
    await prisma.bookingCalendarEvent.upsert({
      where: { inquiryId_cabinId: { inquiryId, cabinId: stay.cabinId } },
      update: { googleEventId: eventId, calendarId: connection.calendarId },
      create: { inquiryId, cabinId: stay.cabinId, googleEventId: eventId, calendarId: connection.calendarId },
    });
  }
  return "synced";
}

async function removeBookingEvents(inquiryId: string): Promise<CalendarSyncOutcome> {
  const auth = await getFreshAccessToken();
  const links = await prisma.bookingCalendarEvent.findMany({ where: { inquiryId } });
  if (!links.length) return "removed";
  if (!auth) {
    // Without a connection the remote events cannot be reached; drop the local
    // links so nothing points at events we can no longer manage.
    await prisma.bookingCalendarEvent.deleteMany({ where: { inquiryId } });
    return "not-connected";
  }
  const { token } = auth;
  for (const link of links) {
    const removed = await calendarFetch(
      `/calendars/${encodeURIComponent(link.calendarId)}/events/${encodeURIComponent(link.googleEventId)}`,
      token,
      { method: "DELETE" }
    );
    if (removed.status !== 204 && removed.status !== 404 && removed.status !== 410) {
      throw new Error(`Google event delete failed (${removed.status}).`);
    }
  }
  await prisma.bookingCalendarEvent.deleteMany({ where: { inquiryId } });
  return "removed";
}

/**
 * Called after a booking status transition. Never throws: the booking mutation
 * has already committed, so a calendar outage must not fail the admin's or
 * customer's action - the outcome is returned for the response payload and a
 * manual re-sync lives on /admin/calendar.
 */
export async function syncBookingCalendarTransition(inquiryId: string, target: StoredBookingStatus): Promise<CalendarSyncOutcome> {
  try {
    if (target === "SCHEDULED") return await syncConfirmedBooking(inquiryId);
    return await removeBookingEvents(inquiryId);
  } catch (error) {
    console.error(`Calendar sync failed for inquiry ${inquiryId}`, error);
    return "failed";
  }
}

/** Backfill for /admin/calendar: push every scheduled booking to the calendar. */
export async function syncAllScheduledBookings(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const connection = await prisma.calendarConnection.findUnique({ where: { id: CONNECTION_ID } });
  if (!connection?.calendarId) return { synced: 0, failed: 0, errors: ["Calendar is not connected."] };
  const scheduled = await prisma.inquiry.findMany({ where: { status: "SCHEDULED" }, select: { id: true } });
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const { id } of scheduled) {
    try {
      const outcome = await syncConfirmedBooking(id);
      if (outcome === "synced") synced += 1;
      else failed += 1;
      if (outcome === "not-connected") errors.push("Calendar is not connected.");
    } catch (error) {
      failed += 1;
      if (errors.length < 5) errors.push(error instanceof Error ? error.message : "Unknown error");
    }
  }
  return { synced, failed, errors: Array.from(new Set(errors)).slice(0, 5) };
}
