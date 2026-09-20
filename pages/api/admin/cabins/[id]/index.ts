import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import { requireAdmin, methodNotAllowed } from "../../../../../lib/admin-api";
import { sanitizeRichText, richTextHasContent } from "../../../../../lib/rich-text";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  const description_es = sanitizeRichText(req.body.description_es);
  const description_en = sanitizeRichText(req.body.description_en);
  if (!richTextHasContent(description_es) || !richTextHasContent(description_en) || description_es.length > 10000 || description_en.length > 10000)
    return res.status(400).json({ error: "Both descriptions are required and must be under 10,000 characters." });
  try {
    const cabin = await prisma.cabin.update({
      where: { id: String(req.query.id) },
      data: { description_es, description_en },
      include: { images: { orderBy: { sort_order: "asc" } } },
    });
    return res.json(JSON.parse(JSON.stringify(cabin)));
  } catch {
    return res.status(404).json({ error: "Cabin not found." });
  }
}
