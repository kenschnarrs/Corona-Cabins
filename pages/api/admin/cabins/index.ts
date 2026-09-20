import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const cabins = await prisma.cabin.findMany({
    include: { images: { orderBy: { sort_order: "asc" } } },
    orderBy: { price_per_night: "desc" },
  });
  return res.json(JSON.parse(JSON.stringify(cabins)));
}
