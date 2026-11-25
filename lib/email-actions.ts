import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, expiring links that let an admin approve one booking request
// straight from the alert email. The token carries only the request id and an
// expiry, signed with NEXTAUTH_SECRET (protected env var, never in source).
// It can do exactly one thing: move that PENDING request to SCHEDULED, through
// the same checks as the dashboard. Links are only ever emailed to the
// ADMIN_ALERT_EMAILS addresses.

export const CONFIRM_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PURPOSE = "confirm-booking";

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET?.trim();
  if (!value) throw new Error("NEXTAUTH_SECRET is not configured.");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(`${PURPOSE}.${payload}`).digest("base64url");
}

export function createConfirmToken(inquiryId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ id: inquiryId, exp: now + CONFIRM_LINK_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// Flat shape (the project does not run strict null checks, which would not
// narrow a discriminated union): inquiryId is set when ok, code when not.
export type ConfirmTokenResult = {
  ok: boolean;
  inquiryId?: string;
  code?: "CONFIRM_LINK_INVALID" | "CONFIRM_LINK_EXPIRED";
};

export function verifyConfirmToken(token: unknown, now = Date.now()): ConfirmTokenResult {
  if (typeof token !== "string" || token.length > 600) return { ok: false, code: "CONFIRM_LINK_INVALID" };
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return { ok: false, code: "CONFIRM_LINK_INVALID" };
  let expected: string;
  try { expected = sign(payload); } catch { return { ok: false, code: "CONFIRM_LINK_INVALID" }; }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, code: "CONFIRM_LINK_INVALID" };
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.id !== "string" || typeof data.exp !== "number") return { ok: false, code: "CONFIRM_LINK_INVALID" };
    if (now > data.exp) return { ok: false, code: "CONFIRM_LINK_EXPIRED" };
    return { ok: true, inquiryId: data.id };
  } catch {
    return { ok: false, code: "CONFIRM_LINK_INVALID" };
  }
}

/** Link to the confirmation page (it asks for one click; opening it changes nothing). */
export function confirmLinkPath(token: string): string {
  return `/admin/confirm?token=${encodeURIComponent(token)}`;
}
