import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const bookings = await prisma.inquiry.findMany({ include: { cabins: { include: { cabin: { select: { name: true } } }, orderBy: { startDate: "asc" } } }, orderBy: { created_at: "desc" }, take: 250 });
  return res.json(JSON.parse(JSON.stringify(bookings)));
}
