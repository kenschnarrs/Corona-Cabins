import type { NextApiRequest, NextApiResponse } from "next";
import { put, del } from "@vercel/blob";
import prisma from "../../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../../lib/admin-api";
import { validateImageUpload } from "../../../../../lib/image-validation";

export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

function safeBaseName(value: unknown) {
  const raw = typeof value === "string" ? value : "cabin-photo";
  return raw.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "cabin-photo";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const cabinId = String(req.query.id);
  const cabin = await prisma.cabin.findUnique({ where: { id: cabinId }, include: { images: { orderBy: { sort_order: "asc" } } } });
  if (!cabin) return res.status(404).json({ error: "Cabin not found." });
  const position = Number(req.body.position);
  const makePrimary = req.body.makePrimary === true;
  if (!Number.isInteger(position) || position < 0 || position > cabin.images.length)
    return res.status(400).json({ error: "Choose a valid photo position." });
  let image;
  try { image = validateImageUpload(req.body.dataUrl, req.body.contentType); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid image." }); }
  const blob = await put(`cabins/${cabinId}/${safeBaseName(req.body.filename)}.${image.extension}`, image.bytes, {
    access: "public", contentType: image.contentType, addRandomSuffix: true,
  });
  try {
    const created = await prisma.$transaction(async (tx) => {
      await Promise.all(cabin.images.slice(position).map((item) => tx.cabinImage.update({ where: { id: item.id }, data: { sort_order: { increment: 1 } } })));
      if (makePrimary) await tx.cabinImage.updateMany({ where: { cabinId, type: "Primary" }, data: { type: "Other" } });
      return tx.cabinImage.create({ data: {
        cabinId, url: blob.url, blob_pathname: blob.pathname,
        type: makePrimary || !cabin.images.length ? "Primary" : "Other",
        sort_order: position,
      }});
    });
    return res.status(201).json(created);
  } catch (error) {
    await del(blob.url).catch(() => undefined);
    throw error;
  }
}
