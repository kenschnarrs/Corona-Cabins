import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { calendarCallbackUri, exchangeCalendarCode, CALENDAR_SCOPE } from "../../../../lib/google-calendar";

function redirect(res: NextApiResponse, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return res.redirect(`/admin/calendar?${query}`);
}

// Google returns here after the admin grants calendar access. The session
// cookie already proved the visitor is an admin before the redirect away, and
// the state cookie proves this callback belongs to that same connect attempt,
// so the tokens issued here can only land on an admin-initiated connection.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" });
  }
  if (typeof req.query.error === "string") return redirect(res, { error: "GOOGLE_DECLINED" });
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const cookies = Object.fromEntries(
    (req.headers.cookie ?? "").split(";").map((part) => {
      const [name, ...rest] = part.trim().split("=");
      return [name, decodeURIComponent(rest.join("="))];
    })
  );
  if (!code || !state || cookies.calendar_oauth_state !== state) {
    return redirect(res, { error: "CONNECT_EXPIRED" });
  }
  try {
    const tokens = await exchangeCalendarCode(code, calendarCallbackUri(req));
    if (!tokens.grantedScope.split(/\s+/).includes(CALENDAR_SCOPE)) {
      return redirect(res, { error: "CALENDAR_SCOPE_MISSING" });
    }
    const existing = await prisma.calendarConnection.findUnique({ where: { id: "primary" } });
    await prisma.calendarConnection.upsert({
      where: { id: "primary" },
      update: {
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        connectedEmail: tokens.connectedEmail || (existing?.connectedEmail ?? ""),
      },
      create: {
        id: "primary",
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        connectedEmail: tokens.connectedEmail,
        calendarId: process.env.GOOGLE_CALENDAR_ID ?? "",
      },
    });
    return redirect(res, { connected: "1" });
  } catch (error) {
    console.error("Calendar connect failed", error);
    return redirect(res, { error: "CONNECT_FAILED" });
  }
}
