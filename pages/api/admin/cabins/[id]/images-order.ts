import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../../lib/admin-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "PUT") return methodNotAllowed(res, ["PUT"]);
  const cabinId = String(req.query.id);
  const ids = Array.isArray(req.body.ids) && req.body.ids.every((id: unknown) => typeof id === "string") ? req.body.ids as string[] : [];
  const current = await prisma.cabinImage.findMany({ where: { cabinId }, select: { id: true } });
  if (ids.length !== current.length || new Set(ids).size !== ids.length || current.some((img) => !ids.includes(img.id)))
    return res.status(400).json({ error: "Image order must include every cabin image exactly once." });
  await prisma.$transaction(ids.map((id, sort_order) => prisma.cabinImage.update({ where: { id }, data: { sort_order } })));
  return res.json({ ok: true });
}
