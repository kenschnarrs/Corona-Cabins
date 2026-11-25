import assert from "node:assert/strict";
import fs from "node:fs";

const emailLib = fs.readFileSync("lib/email.ts", "utf8");
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const createApi = fs.readFileSync("pages/api/bookings/index.ts", "utf8");
const adminApi = fs.readFileSync("pages/api/admin/bookings/[id].ts", "utf8");
const customerApi = fs.readFileSync("pages/api/customer/bookings/[id].ts", "utf8");
const envExample = fs.readFileSync(".env.example", "utf8");

// Static wiring checks.
assert.match(emailLib, /https:\/\/api\.resend\.com\/emails/, "sends through the Resend API");
assert.match(emailLib, /onboarding@resend\.dev/, "defaults to the Resend test sender Ken picked");
assert.match(emailLib, /RESEND_API_KEY/);
assert.match(emailLib, /ADMIN_ALERT_EMAILS/);
assert.match(emailLib, /skipped: true/, "missing key skips instead of failing");
assert.match(emailLib, /AbortController/, "send has a timeout");
assert.match(createApi, /sendBookingReceivedEmails\(/, "request-received email on create");
assert.match(createApi, /req\.body\.locale === "en" \? "en" : "es"/, "create API validates the guest locale");
assert.match(schema, /locale\s+String\s+@default\("es"\)/, "guest locale persists on the inquiry");
assert.match(adminApi, /locale: current\.locale/, "status emails reuse the stored guest locale");
assert.match(customerApi, /locale: booking\.locale/, "customer cancel reuses the stored guest locale");
assert.match(adminApi, /sendBookingScheduledEmail\(emailBooking\)/, "scheduled email on confirm");
assert.match(adminApi, /status === "MANAGEMENT_CANCELLED" && !isCancelledStatus\(current\.status\)/, "management cancel emails once");
assert.match(adminApi, /current\.status !== "SCHEDULED"/, "re-saving scheduled does not re-send");
assert.match(customerApi, /sendBookingCancelledEmail\(/, "customer cancel emails a confirmation");
for (const env of ["RESEND_API_KEY", "EMAIL_FROM", "ADMIN_ALERT_EMAILS"]) assert.match(envExample, new RegExp(env), `.env.example documents ${env}`);

// Ken's rule: management addresses live in protected env config, never source.
for (const file of ["lib/email.ts", "pages/api/bookings/index.ts", "pages/api/admin/bookings/[id].ts", "pages/api/customer/bookings/[id].ts"]) {
  const text = fs.readFileSync(file, "utf8");
  assert.ok(!/knschnarrs|karinavcorona|sandraverovarela/i.test(text), `${file} hardcodes no management email`);
}
console.log("email wiring checks passed");

// Executable checks: compile lib/email.ts and drive it with a mocked fetch.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
execFileSync("npx", ["tsc", "lib/email.ts", "lib/booking.ts", "--outDir", ".test-build-email", "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node", "--lib", "es2022,dom", "--skipLibCheck"], { stdio: "inherit" });
const email = await import(pathToFileURL(`${process.cwd()}/.test-build-email/email.js`).href);

const booking = {
  customerName: "Test <Guest> & Co",
  customerEmail: "guest@example.test",
  customerPhone: "+1 555 0100",
  notes: "Anniversary trip",
  stays: [
    { cabinName: "Cabin 1", startDate: new Date("2027-03-05T13:00:00.000Z"), endDate: new Date("2027-03-08T12:00:00.000Z") },
    { cabinName: "Cabin 2", startDate: new Date("2027-03-05T13:00:00.000Z"), endDate: new Date("2027-03-08T12:00:00.000Z") },
  ],
};

// Pure template behavior. Guest emails are single-language: the booking's
// locale picks Spanish or English, never both. No locale means Spanish, the
// site's default language.
const received = email.buildRequestReceivedEmail(booking);
assert.deepEqual(received.to, ["guest@example.test"]);
assert.equal(received.subject, "Recibimos tu solicitud de reserva", "default locale is Spanish");
assert.ok(received.html.includes("Cabin 1") && received.html.includes("Cabin 2"), "templates list every cabin");
assert.ok(received.html.includes("Test &lt;Guest&gt; &amp; Co"), "HTML escapes the guest name");
assert.ok(!received.html.includes("Test <Guest>"), "no raw HTML injection");
assert.ok(!received.html.includes("We received your booking request"), "Spanish email carries no English section");
assert.ok(!received.text.includes("Your booking status"), "Spanish text part stays Spanish");
const receivedEn = email.buildRequestReceivedEmail({ ...booking, locale: "en" });
assert.equal(receivedEn.subject, "We received your booking request");
assert.ok(receivedEn.text.includes("Cabin 1") && receivedEn.text.includes("March"), "text part carries the stays");
assert.ok(!receivedEn.html.includes("Recibimos tu solicitud"), "English email carries no Spanish section");
assert.ok(receivedEn.html.includes("Test &lt;Guest&gt; &amp; Co"), "English HTML escapes the guest name too");
const scheduled = email.buildScheduledEmail({ ...booking, locale: "en" });
assert.equal(scheduled.subject, "Your booking is confirmed");
assert.match(scheduled.text, /Check-in at 1:00 PM, check-out at 12:00 PM\./);
const scheduledEs = email.buildScheduledEmail(booking);
assert.equal(scheduledEs.subject, "Tu reserva está confirmada");
assert.match(scheduledEs.text, /Entrada a la 1:00 p\. m\., salida a las 12:00 p\. m\./);
assert.ok(!scheduledEs.text.includes("Check-in"), "Spanish confirmation carries no English section");
const cancelled = email.buildCancelledEmail(booking);
assert.equal(cancelled.subject, "Tu reserva fue cancelada");
const cancelledEn = email.buildCancelledEmail({ ...booking, locale: "en" });
assert.equal(cancelledEn.subject, "Your booking was cancelled");
assert.ok(!cancelledEn.html.includes("cancelada"), "English cancellation carries no Spanish section");
assert.equal(email.formatStayDate(new Date("2027-03-05T13:00:00.000Z"), "en"), "Friday, March 5, 2027");
assert.equal(email.formatHour(13, "en"), "1:00 PM");
assert.equal(email.formatHour(12, "es"), "12:00 p. m.");

// Admin alert follows ADMIN_ALERT_EMAILS and never hardcodes recipients.
delete process.env.ADMIN_ALERT_EMAILS;
assert.equal(email.buildAdminNewRequestEmail(booking), null, "no admin alert without recipients configured");
process.env.ADMIN_ALERT_EMAILS = " owner@example.test , manager@example.test ";
const alert = email.buildAdminNewRequestEmail(booking);
assert.deepEqual(alert.to, ["owner@example.test", "manager@example.test"]);
assert.match(alert.subject, /Test <Guest> & Co/, "admin subject names the guest plainly");
assert.ok(alert.html.includes("Anniversary trip") && alert.text.includes("+1 555 0100"), "alert carries contact details and notes");
assert.ok(alert.html.includes("Test &lt;Guest&gt;"), "alert HTML escapes too");

// Send behavior with a mocked fetch.
const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url, init, body: JSON.parse(init.body) });
  return { ok: true, status: 200, text: async () => '{"id":"re_test"}' };
};

delete process.env.RESEND_API_KEY;
const skipped = await email.sendEmail(received);
assert.equal(skipped.skipped, true, "missing API key skips the send");
assert.equal(calls.length, 0, "no HTTP call without a key");

process.env.RESEND_API_KEY = "re_test_key";
delete process.env.EMAIL_FROM;
await email.sendBookingReceivedEmails(booking);
assert.equal(calls.length, 2, "guest confirmation plus admin alert");
assert.equal(calls[0].url, "https://api.resend.com/emails");
assert.equal(calls[0].init.headers.Authorization, "Bearer re_test_key");
assert.equal(calls[0].body.from, "Cabañas Corona <onboarding@resend.dev>", "test sender default");
assert.deepEqual(calls[0].body.to, ["guest@example.test"]);
assert.deepEqual(calls[1].body.to, ["owner@example.test", "manager@example.test"]);
assert.equal(typeof calls[0].body.html, "string");
assert.equal(typeof calls[0].body.text, "string");

process.env.EMAIL_FROM = "Cabañas Corona <bookings@cabins.example>";
calls.length = 0;
await email.sendBookingScheduledEmail(booking);
assert.equal(calls[0].body.from, "Cabañas Corona <bookings@cabins.example>", "EMAIL_FROM override wins");
assert.equal(calls.length, 1, "scheduled sends the guest only");

globalThis.fetch = async () => ({ ok: false, status: 422, text: async () => '{"name":"validation_error"}' });
const failed = await email.sendEmail(received);
assert.equal(failed.ok, false, "Resend rejection is reported, not thrown");
globalThis.fetch = async () => { throw new Error("network down"); };
const errored = await email.sendEmail(received);
assert.equal(errored.ok, false, "network errors are reported, not thrown");

fs.rmSync(".test-build-email", { recursive: true, force: true });
console.log("email send/template checks passed");
