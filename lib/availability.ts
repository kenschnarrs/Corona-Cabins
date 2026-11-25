import type { PrismaClient } from "@prisma/client";
import { BLOCKING_STATUSES } from "./booking";

/**
 * Public availability calendar helpers. Only dates leave the server: no guest
 * names, request numbers, or statuses. A day is "blocked" for arrival or
 * departure if it falls inside [arrival day, departure day] of a held stay,
 * which matches the 8-hour cleaning buffer rule (check-out 12:00, next
 * check-in no earlier than 20:00 the same day, i.e. not offered).
 */
export type DayRange = { start: string; end: string };
export type CabinBlockedRanges = Record<string, DayRange[]>;

const DAY_MS = 86400000;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(day: string, days: number): string {
  return dayKey(new Date(new Date(`${day}T00:00:00Z`).getTime() + days * DAY_MS));
}

/** Every day key from start to end, inclusive. */
export function daysInRange(range: DayRange): string[] {
  const out: string[] = [];
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) out.push(day);
  return out;
}

export function blockedDaySet(ranges: DayRange[]): Set<string> {
  const set = new Set<string>();
  for (const range of ranges) for (const day of daysInRange(range)) set.add(day);
  return set;
}

/**
 * Days to show as booked. With cabins selected, a day is booked if ANY
 * selected cabin is held (the guest needs all of them). With none selected,
 * a day is booked only when EVERY cabin is held (the whole property is full).
 */
export function bookedDays(blocked: CabinBlockedRanges, selectedIds: string[], allIds: string[]): Set<string> {
  const sets = (selectedIds.length ? selectedIds : allIds).map((id) => blockedDaySet(blocked[id] ?? []));
  if (!sets.length) return new Set();
  if (selectedIds.length) return new Set(sets.flatMap((set) => Array.from(set)));
  return new Set(Array.from(sets[0]).filter((day) => sets.every((set) => set.has(day))));
}

/** True when no day from arrival through departure (inclusive) is booked. */
export function rangeIsFree(booked: Set<string>, start: string, end: string): boolean {
  return daysInRange({ start, end }).every((day) => !booked.has(day));
}

export type DaySelection = { start: string; end: string; blockedRange: boolean };

/**
 * What tapping a calendar day does. First tap (or a tap on/before the current
 * arrival, or any tap once both ends are set) starts a new stay at that day.
 * A later tap sets the departure, unless a booked day sits inside the stay, in
 * which case the tapped day becomes the new arrival and blockedRange is set so
 * the UI can explain why.
 */
export function nextSelection(start: string, end: string, day: string, booked: Set<string>): DaySelection {
  if (!start || end || day <= start) return { start: day, end: "", blockedRange: false };
  if (!rangeIsFree(booked, start, day)) return { start: day, end: "", blockedRange: true };
  return { start, end: day, blockedRange: false };
}

/**
 * Date-only blocked ranges per cabin for stays that have not finished yet.
 * Read-only; never exposes who booked.
 */
export async function getBlockedRanges(
  db: Pick<PrismaClient, "cabinInquiry">,
  now = new Date()
): Promise<CabinBlockedRanges> {
  const rows = await db.cabinInquiry.findMany({
    where: { inquiry: { status: { in: BLOCKING_STATUSES } }, endDate: { gte: now } },
    select: { cabinId: true, startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });
  const result: CabinBlockedRanges = {};
  for (const row of rows) (result[row.cabinId] ??= []).push({ start: dayKey(row.startDate), end: dayKey(row.endDate) });
  return result;
}
