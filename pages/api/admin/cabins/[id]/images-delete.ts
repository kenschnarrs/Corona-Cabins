import type { NextApiRequest, NextApiResponse } from "next";
import { del } from "@vercel/blob";
import prisma from "../../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../../lib/admin-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "DELETE") return methodNotAllowed(res, ["DELETE"]);
  const cabinId = String(req.query.id), imageId = typeof req.body.imageId === "string" ? req.body.imageId : "";
  const image = await prisma.cabinImage.findFirst({ where: { id: imageId, cabinId } });
  if (!image) return res.status(404).json({ error: "Image not found for this cabin." });
  if (!image.blob_pathname) return res.status(409).json({ error: "This legacy image is not managed by Blob and cannot be deleted here." });
  await del(image.url);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.cabinImage.delete({ where: { id: image.id } });
      const remaining = await tx.cabinImage.findMany({ where: { cabinId }, orderBy: { sort_order: "asc" } });
      if (image.type === "Primary" && remaining[0]) await tx.cabinImage.update({ where: { id: remaining[0].id }, data: { type: "Primary" } });
      await Promise.all(remaining.map((item, sort_order) => tx.cabinImage.update({ where: { id: item.id }, data: { sort_order } })));
    });
  } catch {
    return res.status(500).json({ error: "Blob was deleted, but database cleanup failed. Contact support before retrying." });
  }
  return res.json({ ok: true });
}
