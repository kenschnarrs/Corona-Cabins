import assert from "node:assert/strict";
import fs from "node:fs";
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const api = fs.readFileSync("pages/api/bookings/index.ts", "utf8");
const auth = fs.readFileSync("pages/api/auth/[...nextauth].ts", "utf8");
const booking = fs.readFileSync("lib/booking.ts", "utf8");
const ui = fs.readFileSync("components/BookingFlow.tsx", "utf8");
assert.match(schema, /enum BookingStatus/);
assert.match(schema, /@@index\(\[cabinId, startDate, endDate\]\)/);
assert.match(booking, /CLEANING_BUFFER_HOURS = 8/);
assert.match(booking, /PENDING", "SCHEDULED", "ACTIVE/);
assert.match(api, /Serializable/);
assert.match(api, /status\(409\)/);
assert.match(ui, /conflicts\.map/);
assert.match(ui, /Edit booking|b\.edit/);
assert.match(ui, /locale: lang/, "booking request carries the guest's site language");
assert.match(ui, /confirmationTitle/, "submit lands on a dedicated confirmation screen, not an inline banner");
assert.match(ui, /if \(status === "success"\)/, "confirmation screen replaces the form after submit");
assert.match(ui, /#\$\{requestNumber\}/, "confirmation screen shows the friendly request number, not the cuid");
assert.match(schema, /request_number\s+Int\s+@unique/, "sequential request number stored on the inquiry");
const requestNumberMigration = fs.readFileSync("prisma/migrations/20261125033000_request_number/migration.sql", "utf8");
assert.match(requestNumberMigration, /CREATE SEQUENCE inquiry_request_number_seq/, "a Postgres sequence keeps concurrent submits safe");
assert.match(api, /requestNumber: result\.requestNumber/, "create API returns the friendly number");
const customerPage = fs.readFileSync("pages/customer/bookings.tsx", "utf8");
assert.match(customerPage, /#\{booking\.request_number\}/, "status page shows the friendly number");
assert.match(customerPage, /c\.requestLabel/, "status page request label is localized");
assert.ok(!/Request \{booking\.id\}/.test(customerPage), "status page no longer shows the raw cuid");
const adminPage = fs.readFileSync("pages/inquiries.tsx", "utf8");
assert.match(adminPage, /requestLabel\} #\{booking\.request_number\}/, "admin list shows the friendly number");
assert.match(adminPage, /t\.admin\.inquiries/, "admin booking list is localized");
assert.match(adminPage, /adminErrorMessage/, "admin booking list shows API errors in the admin's language");
assert.match(booking, /class StayDateError/, "stay-date validation carries machine-readable error codes");
assert.match(booking, /ARRIVAL_NOT_FUTURE/, "same-day check-in is blocked server-side");
assert.match(ui, /min=\{tomorrow\}/, "arrival picker opens at tomorrow, blocking same-day check-in");
assert.match(ui, /apiErrorMessage/, "booking form shows API errors in the guest's language");
assert.match(ui, /b\.signInNote/, "booking sign-in note is localized");
assert.match(customerPage, /apiErrorMessage/, "customer status page shows API errors in the guest's language");
assert.match(customerPage, /t\.customerBookings|customerBookings/, "customer status page is localized");
const footer = fs.readFileSync("components/SiteFooter.tsx", "utf8");
assert.match(footer, /t\.footer\.myBookings/, "footer bookings link is localized");
assert.match(auth, /signIn: "\/auth\/signin"/, "localized sign-in page replaces the English NextAuth default");
const signinPage = fs.readFileSync("pages/auth/signin.tsx", "utf8");
assert.match(signinPage, /t\.auth\.google/, "sign-in page renders the localized Google button");
console.log("booking-flow checks passed");

assert.match(booking, /now >= endDate.*COMPLETED/);
assert.match(booking, /CUSTOMER_CANCELLED.*MANAGEMENT_CANCELLED/);
const customerApi = fs.readFileSync("pages/api/customer/bookings/[id].ts", "utf8");
assert.match(auth, /email_verified/);
assert.match(customerApi, /customer_email: auth\.email/);
assert.match(customerApi, /\["PENDING", "SCHEDULED"\]/);
assert.match(customerApi, /CUSTOMER_CANCELLED/);
const review = fs.readFileSync("pages/review-booking-lifecycle.tsx", "utf8");
const customerList = fs.readFileSync("pages/api/customer/bookings/index.ts", "utf8");
const adminList = fs.readFileSync("pages/api/admin/bookings/index.ts", "utf8");
assert.match(review, /VERCEL_ENV === "production".*notFound/);
for (const state of ["PENDING", "SCHEDULED", "CUSTOMER_CANCELLED", "MANAGEMENT_CANCELLED", "ACTIVE", "COMPLETED"]) assert.match(review, new RegExp(state));
assert.match(customerList, /customer_email: auth\.email/);
assert.match(adminList, /requireAdmin/);

// Regression gate for the PR #5 management-confirm 500 and lifecycle rules.
const bookingLib = fs.readFileSync("lib/booking.ts", "utf8");
const adminId = fs.readFileSync("pages/api/admin/bookings/[id].ts", "utf8");
assert.match(bookingLib, /export function bookingConflictWhere/);
const flatBookingLib = bookingLib.split(String.fromCharCode(10)).join(" ");
assert.ok(!/inquiry: \{ status:[^;]*inquiryId/.test(flatBookingLib), "self-exclusion must not nest inquiryId inside the inquiry relation filter");
assert.match(bookingLib, /inquiryId: \{ not: excludeInquiryId \}/);
assert.match(bookingLib, /export function managementTransitionError/);
assert.match(bookingLib, /REQUEST_ALREADY_CANCELLED/, "transition guard returns machine-readable codes");
assert.match(adminId, /managementTransitionError\(effective, status\)/);
assert.match(adminId, /effectiveBookingStatus\(current\.status/, "guard runs on the time-derived effective status");
assert.match(adminId, /isCancelledStatus\(current\.status\)/, "reactivation re-runs the conflict check");
assert.match(adminId, /MANAGEMENT_TARGET_STATUSES/);
const inquiriesUi = fs.readFileSync("pages/inquiries.tsx", "utf8");
assert.match(inquiriesUi, /\["PENDING","SCHEDULED"\]\.includes\(booking\.status\)/);

// Executable check: the conflict filter shape and transition guard actually behave.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
execFileSync("npx", ["tsc", "lib/booking.ts", "--outDir", ".test-build", "--module", "commonjs", "--target", "es2020", "--moduleResolution", "node", "--skipLibCheck"], { stdio: "inherit" });
const { findBookingConflicts, managementTransitionError, parseStayDates, StayDateError } = await import(pathToFileURL(`${process.cwd()}/.test-build/booking.js`).href);
let captured;
const mockDb = { cabinInquiry: { findMany: async (args) => { captured = args; return []; } } };
await findBookingConflicts(mockDb, ["cabin-1"], new Date("2026-10-09T13:00:00.000Z"), new Date("2026-10-11T12:00:00.000Z"), "self-id");
assert.equal(captured.where.inquiryId.not, "self-id", "self-exclusion applies on the CabinInquiry row");
assert.deepEqual(captured.where.inquiry, { status: { in: ["PENDING", "SCHEDULED", "ACTIVE"] } }, "status filter untouched and free of inquiryId");
assert.equal(captured.where.startDate.lt.toISOString(), "2026-10-11T20:00:00.000Z", "checkout plus 8h buffer");
assert.equal(captured.where.endDate.gt.toISOString(), "2026-10-09T05:00:00.000Z", "check-in minus 8h buffer");
await findBookingConflicts(mockDb, ["cabin-1"], new Date("2026-10-09T13:00:00.000Z"), new Date("2026-10-11T12:00:00.000Z"));
assert.ok(!("inquiryId" in captured.where), "no self-exclusion without an id");
assert.equal(managementTransitionError("ACTIVE", "PENDING"), "STAY_ALREADY_STARTED");
assert.equal(managementTransitionError("COMPLETED", "SCHEDULED"), "STAY_ALREADY_STARTED");
assert.equal(managementTransitionError("CUSTOMER_CANCELLED", "MANAGEMENT_CANCELLED"), "REQUEST_ALREADY_CANCELLED");
assert.equal(managementTransitionError("MANAGEMENT_CANCELLED", "MANAGEMENT_CANCELLED"), "REQUEST_ALREADY_CANCELLED");
assert.equal(managementTransitionError("CUSTOMER_CANCELLED", "PENDING"), null, "management may reactivate a customer cancellation");
assert.equal(managementTransitionError("MANAGEMENT_CANCELLED", "SCHEDULED"), null, "management may reactivate its own cancellation");
assert.equal(managementTransitionError("PENDING", "SCHEDULED"), null);
assert.equal(managementTransitionError("SCHEDULED", "MANAGEMENT_CANCELLED"), null);
// Stay-date rules actually behave: same-day check-in blocked, 1-night minimum.
const isoDay = (d) => d.toISOString().slice(0, 10);
const shiftDays = (days) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); return isoDay(d); };
const expectStayCode = (code, fn) => { try { fn(); } catch (e) { assert.ok(e instanceof StayDateError, `${code} throws StayDateError`); assert.equal(e.code, code); return; } assert.fail(`expected ${code}`); };
expectStayCode("ARRIVAL_NOT_FUTURE", () => parseStayDates(shiftDays(0), shiftDays(2)));
expectStayCode("ARRIVAL_NOT_FUTURE", () => parseStayDates(shiftDays(-1), shiftDays(1)));
expectStayCode("DEPARTURE_NOT_AFTER_ARRIVAL", () => parseStayDates(shiftDays(3), shiftDays(3)));
expectStayCode("DEPARTURE_NOT_AFTER_ARRIVAL", () => parseStayDates(shiftDays(4), shiftDays(3)));
expectStayCode("DATES_TOO_FAR", () => parseStayDates(shiftDays(740), shiftDays(742)));
expectStayCode("INVALID_DATES", () => parseStayDates("next week", shiftDays(3)));
const allowed = parseStayDates(shiftDays(1), shiftDays(3));
assert.equal(isoDay(allowed.startDate), shiftDays(1), "tomorrow arrival is the earliest allowed");
console.log("stay-date rule checks passed");

// Every error code an API can return has a guest-facing translation, and
// every translated code is actually emitted somewhere.
const esDict = JSON.parse(fs.readFileSync("lib/i18n/es.json", "utf8"));
const enDict = JSON.parse(fs.readFileSync("lib/i18n/en.json", "utf8"));
const apiSources = ["pages/api/bookings/availability.ts", "pages/api/bookings/index.ts", "pages/api/customer/bookings/[id].ts", "lib/customer-api.ts"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
const emittedCodes = new Set([...apiSources.matchAll(/code: "([A-Z_]+)"/g)].map((m) => m[1]));
assert.ok(emittedCodes.size >= 10, "guest-facing APIs emit machine-readable error codes");
for (const code of emittedCodes) {
  assert.ok(esDict.errors[code], `es.json missing errors.${code}`);
  assert.ok(enDict.errors[code], `en.json missing errors.${code}`);
}
for (const code of Object.keys(esDict.errors)) {
  assert.ok(emittedCodes.has(code) || bookingLib.includes(`"${code}"`), `errors.${code} is never emitted`);
}
console.log("error-code localization checks passed");

// Admin pages are localized too, and every admin API error code has a
// translation in the admin.errors dictionary (and vice versa).
const adminCalendarPage = fs.readFileSync("pages/admin/calendar.tsx", "utf8");
const cabinEditPage = fs.readFileSync("pages/admin/cabins/[id].tsx", "utf8");
const richTextEditor = fs.readFileSync("components/RichTextEditor.tsx", "utf8");
assert.match(adminCalendarPage, /t\.admin\.calendar/, "calendar sync page is localized");
assert.match(adminCalendarPage, /adminErrorMessage/, "calendar sync page shows API errors in the admin's language");
assert.match(cabinEditPage, /t\.admin\.cabinEdit/, "cabin editor is localized");
assert.match(cabinEditPage, /adminErrorMessage/, "cabin editor shows API errors in the admin's language");
assert.match(richTextEditor, /t\.admin\.richText/, "rich-text toolbar is localized");
const adminApiSources = [
  "pages/api/admin/bookings/[id].ts",
  "pages/api/admin/calendar/index.ts",
  "pages/api/admin/calendar/sync.ts",
  "pages/api/admin/calendar/connect.ts",
  "pages/api/admin/calendar/callback.ts",
  "pages/api/admin/cabins/index.ts",
  "pages/api/admin/cabins/[id]/index.ts",
  "pages/api/admin/cabins/[id]/images.ts",
  "pages/api/admin/cabins/[id]/images-delete.ts",
  "pages/api/admin/cabins/[id]/images-order.ts",
  "pages/api/admin/cabins/[id]/images-primary.ts",
  "lib/admin-api.ts",
].map((f) => fs.readFileSync(f, "utf8")).join("\n");
const adminEmitted = new Set([
  ...[...adminApiSources.matchAll(/code: "([A-Z_]+)"/g)].map((m) => m[1]),
  // The calendar OAuth callback passes its failure code as the ?error= param.
  ...[...adminApiSources.matchAll(/error: "([A-Z_]+)" \}\)/g)].map((m) => m[1]),
]);
assert.ok(adminEmitted.size >= 15, "admin APIs emit machine-readable error codes");
for (const code of adminEmitted) {
  assert.ok(esDict.admin.errors[code], `es.json missing admin.errors.${code}`);
  assert.ok(enDict.admin.errors[code], `en.json missing admin.errors.${code}`);
}
for (const code of Object.keys(esDict.admin.errors)) {
  assert.ok(adminEmitted.has(code) || bookingLib.includes(`"${code}"`), `admin.errors.${code} is never emitted`);
}
console.log("admin localization checks passed");

fs.rmSync(".test-build", { recursive: true, force: true });
console.log("conflict-filter and transition-guard checks passed");
