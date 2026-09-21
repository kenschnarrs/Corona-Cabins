import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireCustomer } from "../../../../lib/customer-api";
import { effectiveBookingStatus } from "../../../../lib/booking";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireCustomer(req, res); if (!auth) return;
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed." }); }
  const rows = await prisma.inquiry.findMany({ where: { customer_email: auth.email }, include: { cabins: { include: { cabin: { select: { name: true } } } } }, orderBy: { created_at: "desc" } });
  return res.json(JSON.parse(JSON.stringify(rows.map((row) => ({ ...row, effective_status: effectiveBookingStatus(row.status, row.cabins[0]?.startDate ?? row.created_at, row.cabins[0]?.endDate) })))));
}
