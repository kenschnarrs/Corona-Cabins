import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, methodNotAllowed } from "../../../../lib/admin-api";
import { changeBookingStatus } from "../../../../lib/booking-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "PATCH") return methodNotAllowed(res, ["PATCH"]);
  const result = await changeBookingStatus(String(req.query.id), req.body.status);
  return res.status(result.httpStatus).json(result.body);
}
