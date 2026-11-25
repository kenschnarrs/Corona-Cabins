// Server-only booking confirmation emails via Resend (https://resend.com).
//
// Configuration lives in protected environment variables, never in source:
//   RESEND_API_KEY      - Resend API key (collected through the secure vault)
//   EMAIL_FROM          - sender identity. Defaults to Resend's test sender,
//                         which only delivers to the Resend account owner until
//                         a sending domain is verified.
//   ADMIN_ALERT_EMAILS  - comma-separated management addresses that receive
//                         the new-booking-request alert.
//
// Missing configuration disables sending with a warning. Booking operations
// must never fail because an email could not be sent, so every send is
// best-effort: errors are logged and returned, never thrown.

import { CHECK_IN_HOUR, CHECK_OUT_HOUR } from "./booking";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Cabañas Corona <onboarding@resend.dev>";
const SEND_TIMEOUT_MS = 8000;

export type EmailLocale = "es" | "en";

export type EmailStay = {
  cabinName: string;
  startDate: Date;
  endDate: Date;
};

export type EmailBooking = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  notes?: string | null;
  /**
   * Guest's site language at booking time. Guest emails go out in this one
   * language rather than bilingual. Defaults to Spanish, the site's default.
   */
  locale?: EmailLocale;
  stays: EmailStay[];
};

export function emailLocale(booking: EmailBooking): EmailLocale {
  return booking.locale === "en" ? "en" : "es";
}

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text: string;
};

export type SendResult =
  | { ok: true }
  | { ok: false; skipped: true; error: string }
  | { ok: false; skipped?: false; error: string };

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

export function getAdminAlertEmails(): string[] {
  return (process.env.ADMIN_ALERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Dates are stored at fixed UTC hours, so format date-only in UTC to match. */
export function formatStayDate(date: Date, locale: "es" | "en"): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** 13 -> "1:00 PM" / "1:00 p. m." */
export function formatHour(hour: number, locale: "es" | "en"): string {
  const suffix = hour < 12 ? (locale === "es" ? "a. m." : "AM") : (locale === "es" ? "p. m." : "PM");
  return `${hour % 12 || 12}:00 ${suffix}`;
}

function siteBaseUrl(): string {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "";
}

export function customerBookingsUrl(): string {
  return `${siteBaseUrl()}/customer/bookings`;
}

export function adminBookingsUrl(): string {
  return `${siteBaseUrl()}/admin`;
}

function stayLines(booking: EmailBooking, locale: "es" | "en"): string[] {
  return booking.stays.map(
    (stay) => `${stay.cabinName}: ${formatStayDate(stay.startDate, locale)} → ${formatStayDate(stay.endDate, locale)}`
  );
}

function page(htmlBody: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1f2937;max-width:560px;margin:0 auto;padding:24px;">${htmlBody}<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" /><p style="font-size:13px;color:#6b7280;">Cabañas Corona</p></body></html>`;
}

function staysHtml(booking: EmailBooking, locale: "es" | "en"): string {
  const items = stayLines(booking, locale)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
}

function linkHtml(url: string, label: string): string {
  return url ? `<p><a href="${escapeHtml(url)}">${escapeHtml(label)}</a></p>` : "";
}

type GuestCopy = {
  greeting: string;
  body: string;
  link: string;
  textLink: string;
  subject: string;
};

function buildGuestEmail(booking: EmailBooking, copy: GuestCopy): EmailMessage {
  const locale = emailLocale(booking);
  const statusUrl = customerBookingsUrl();
  const html = page(`
    <p>${copy.greeting} ${escapeHtml(booking.customerName)},</p>
    <p>${copy.body}</p>
    ${staysHtml(booking, locale)}
    ${linkHtml(statusUrl, copy.link)}
  `);
  const text = [
    `${copy.greeting} ${booking.customerName},`,
    "",
    copy.body,
    ...stayLines(booking, locale),
    statusUrl ? copy.textLink : "",
  ].filter(Boolean).join("\n");
  return { to: [booking.customerEmail], subject: copy.subject, html, text };
}

export function buildRequestReceivedEmail(booking: EmailBooking): EmailMessage {
  const locale = emailLocale(booking);
  const statusUrl = customerBookingsUrl();
  return buildGuestEmail(booking, locale === "es"
    ? {
        greeting: "Hola",
        body: "Recibimos tu solicitud de reserva. La revisaremos y te confirmaremos por correo.",
        link: "Ver el estado de tu reserva",
        textLink: `Estado de tu reserva: ${statusUrl}`,
        subject: "Recibimos tu solicitud de reserva",
      }
    : {
        greeting: "Hi",
        body: "We received your booking request. We will review it and confirm by email.",
        link: "View your booking status",
        textLink: `Your booking status: ${statusUrl}`,
        subject: "We received your booking request",
      });
}

export function buildScheduledEmail(booking: EmailBooking): EmailMessage {
  const locale = emailLocale(booking);
  const statusUrl = customerBookingsUrl();
  return buildGuestEmail(booking, locale === "es"
    ? {
        greeting: "Hola",
        body: `Tu reserva está confirmada. Entrada a la ${formatHour(CHECK_IN_HOUR, "es")}, salida a las ${formatHour(CHECK_OUT_HOUR, "es")}.`,
        link: "Ver tu reserva",
        textLink: `Tu reserva: ${statusUrl}`,
        subject: "Tu reserva está confirmada",
      }
    : {
        greeting: "Hi",
        body: `Your booking is confirmed. Check-in at ${formatHour(CHECK_IN_HOUR, "en")}, check-out at ${formatHour(CHECK_OUT_HOUR, "en")}.`,
        link: "View your booking",
        textLink: `Your booking: ${statusUrl}`,
        subject: "Your booking is confirmed",
      });
}

export function buildCancelledEmail(booking: EmailBooking): EmailMessage {
  const locale = emailLocale(booking);
  const statusUrl = customerBookingsUrl();
  return buildGuestEmail(booking, locale === "es"
    ? {
        greeting: "Hola",
        body: "Tu reserva fue cancelada. Si no esperabas esto, responde a este correo.",
        link: "Ver el estado de tu reserva",
        textLink: `Estado de tu reserva: ${statusUrl}`,
        subject: "Tu reserva fue cancelada",
      }
    : {
        greeting: "Hi",
        body: "Your booking was cancelled. If you were not expecting this, reply to this email.",
        link: "View your booking status",
        textLink: `Your booking status: ${statusUrl}`,
        subject: "Your booking was cancelled",
      });
}

export function buildAdminNewRequestEmail(booking: EmailBooking): EmailMessage | null {
  const recipients = getAdminAlertEmails();
  if (!recipients.length) return null;
  const notes = booking.notes?.trim();
  const rows = [
    ["Guest", booking.customerName],
    ["Email", booking.customerEmail],
    ["Phone", booking.customerPhone ?? ""],
    ...booking.stays.map((stay) => [
      "Stay",
      `${stay.cabinName}: ${formatStayDate(stay.startDate, "en")} → ${formatStayDate(stay.endDate, "en")}`,
    ] as const),
    ["Notes", notes ?? ""],
  ].filter(([, value]) => value);
  const html = page(`
    <p>New booking request.</p>
    <table cellpadding="4" style="border-collapse:collapse;">${rows
      .map(([label, value]) => `<tr><td style="vertical-align:top;color:#6b7280;">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
      .join("")}</table>
    ${linkHtml(adminBookingsUrl(), "Review in the admin dashboard")}
  `);
  const text = [
    "New booking request.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    adminBookingsUrl() ? `Admin dashboard: ${adminBookingsUrl()}` : "",
  ].filter(Boolean).join("\n");
  return {
    to: recipients,
    subject: `New booking request: ${booking.customerName}`,
    html,
    text,
  };
}

/**
 * Best-effort send through the Resend API. Awaits before returning so the
 * serverless function does not freeze the request mid-send.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`RESEND_API_KEY is not configured; skipping email "${message.subject}"`);
    return { ok: false, skipped: true, error: "RESEND_API_KEY is not configured." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      console.error(`Resend rejected email "${message.subject}" (${response.status}): ${detail}`);
      return { ok: false, error: `Resend responded ${response.status}.` };
    }
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send email "${message.subject}": ${reason}`);
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendBookingReceivedEmails(booking: EmailBooking): Promise<void> {
  await sendEmail(buildRequestReceivedEmail(booking));
  const adminAlert = buildAdminNewRequestEmail(booking);
  if (adminAlert) await sendEmail(adminAlert);
}

export async function sendBookingScheduledEmail(booking: EmailBooking): Promise<void> {
  await sendEmail(buildScheduledEmail(booking));
}

export async function sendBookingCancelledEmail(booking: EmailBooking): Promise<void> {
  await sendEmail(buildCancelledEmail(booking));
}
