import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
import { findBookingConflicts, parseStayDates } from "../../../lib/booking";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (clean(req.body.website, 200)) return res.status(201).json({ ok: true });
  const cabinIds = Array.isArray(req.body.cabinIds) ? req.body.cabinIds.filter((id: unknown): id is string => typeof id === "string") : [];
  const customerName = clean(req.body.customerName, 120);
  const customerEmail = clean(req.body.customerEmail, 254).toLowerCase();
  const customerPhone = clean(req.body.customerPhone, 40);
  const notes = clean(req.body.notes, 2000);
  if (!cabinIds.length || cabinIds.length > 10 || new Set(cabinIds).size !== cabinIds.length) return res.status(400).json({ error: "Choose at least one cabin." });
  if (customerName.length < 2 || !emailPattern.test(customerEmail) || customerPhone.length < 7) return res.status(400).json({ error: "Enter your name, a valid email, and a phone number." });
  try {
    const { startDate, endDate } = parseStayDates(req.body.startDate, req.body.endDate);
    const result = await prisma.$transaction(async (tx) => {
      const cabins = await tx.cabin.findMany({ where: { id: { in: cabinIds } }, select: { id: true, name: true } });
      if (cabins.length !== cabinIds.length) return { kind: "error" as const, error: "One or more selected cabins no longer exist." };
      const conflicts = await findBookingConflicts(tx as typeof prisma, cabinIds, startDate, endDate);
      if (conflicts.length) return { kind: "conflict" as const, conflicts };
      const inquiry = await tx.inquiry.create({
        data: {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          notes,
          cabins: { create: cabins.map((cabin) => ({ cabinId: cabin.id, startDate, endDate, header: `Booking request for ${cabin.name}`, body: notes })) },
        },
        select: { id: true },
      });
      return { kind: "created" as const, id: inquiry.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.kind === "conflict") return res.status(409).json({ error: "The requested stay is no longer available.", conflicts: result.conflicts });
    if (result.kind === "error") return res.status(400).json({ error: result.error });
    return res.status(201).json({ ok: true, requestId: result.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return res.status(409).json({ error: "Availability changed while you submitted. Please check the dates again." });
    throw error;
  }
}
