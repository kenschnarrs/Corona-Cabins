import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../../lib/admin-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "PUT") return methodNotAllowed(res, ["PUT"]);
  const cabinId = String(req.query.id), imageId = typeof req.body.imageId === "string" ? req.body.imageId : "";
  const target = await prisma.cabinImage.findFirst({ where: { id: imageId, cabinId } });
  if (!target) return res.status(404).json({ error: "Image not found for this cabin." });
  await prisma.$transaction([
    prisma.cabinImage.updateMany({ where: { cabinId, type: "Primary" }, data: { type: "Other" } }),
    prisma.cabinImage.update({ where: { id: imageId }, data: { type: "Primary" } }),
  ]);
  return res.json({ ok: true });
}
