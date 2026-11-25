import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";
import { buildCalendarConnectUrl, calendarCallbackUri } from "../../../../lib/google-calendar";

// Starts the admin Google Calendar connect flow. The state cookie guards the
// callback against CSRF (an attacker could otherwise connect their own Google
// account to the site's calendar settings).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!process.env.GOOGLE_ID || !process.env.GOOGLE_SECRET) {
    return res.status(500).json({ error: "Google sign-in is not configured on this deployment.", code: "GOOGLE_NOT_CONFIGURED" });
  }
  const state = randomBytes(16).toString("hex");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `calendar_oauth_state=${state}; Path=/api/admin/calendar; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);
  return res.redirect(buildCalendarConnectUrl(state, calendarCallbackUri(req)));
}
