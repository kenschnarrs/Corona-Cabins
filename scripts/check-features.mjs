// Checks for the availability calendar, photo gallery, WhatsApp link, social
// preview cards, and confirm-from-email. Pure logic is compiled and executed;
// wiring is checked statically. Run with `npm test`.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const out = ".test-build-features";
execFileSync("npx", ["tsc", "lib/availability.ts", "lib/booking.ts", "lib/email-actions.ts", "lib/email.ts", "lib/whatsapp.ts", "lib/seo.ts", "lib/gallery.ts", "--outDir", out, "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node", "--lib", "es2022,dom", "--skipLibCheck", "--types", "node"], { stdio: "inherit" });
const load = (name) => import(pathToFileURL(`${process.cwd()}/${out}/${name}.js`).href).then((m) => m.default ?? m);
const [availability, booking, actions, email, whatsapp, seo, gallery] = await Promise.all(["availability", "booking", "email-actions", "email", "whatsapp", "seo", "gallery"].map(load));

// --- Availability calendar -------------------------------------------------
const ranges = [{ start: "2027-03-05", end: "2027-03-08" }];
const set = availability.blockedDaySet(ranges);
assert.deepEqual([...set].sort(), ["2027-03-05", "2027-03-06", "2027-03-07", "2027-03-08"], "a held stay blocks arrival day through departure day");
assert.deepEqual(availability.daysInRange({ start: "2027-02-27", end: "2027-03-02" }), ["2027-02-27", "2027-02-28", "2027-03-01", "2027-03-02"], "ranges cross month ends");
assert.equal(availability.addDays("2027-12-31", 1), "2028-01-01");

const blocked = { A: [{ start: "2027-03-05", end: "2027-03-08" }], B: [{ start: "2027-03-07", end: "2027-03-10" }] };
const union = availability.bookedDays(blocked, ["A", "B"], ["A", "B", "C"]);
assert.ok(union.has("2027-03-05") && union.has("2027-03-10"), "selected cabins: booked if ANY selected cabin is held");
const none = availability.bookedDays(blocked, [], ["A", "B"]);
assert.deepEqual([...none].sort(), ["2027-03-07", "2027-03-08"], "no selection: booked only when EVERY cabin is held");
assert.equal(availability.bookedDays(blocked, [], ["A", "B", "C"]).size, 0, "an unbooked cabin means the property is not full");
assert.equal(availability.bookedDays({}, [], []).size, 0, "no cabins is empty, not a crash");
assert.equal(availability.rangeIsFree(set, "2027-03-01", "2027-03-04"), true, "a stay ending the day before arrival is free");
assert.equal(availability.rangeIsFree(set, "2027-03-09", "2027-03-11"), true, "arriving the day after departure is free");
assert.equal(availability.rangeIsFree(set, "2027-03-04", "2027-03-05"), false, "departing on the next arrival day is not allowed (cleaning buffer)");
assert.equal(availability.rangeIsFree(set, "2027-03-08", "2027-03-10"), false, "arriving on the previous departure day is not allowed (cleaning buffer)");
assert.equal(availability.rangeIsFree(set, "2027-03-01", "2027-03-12"), false, "a stay spanning a booked stay is not free");

// The calendar must agree with the server's real conflict rule. Brute-force
// every stay pair in a window against the exact buffered time-overlap check.
const hour = (day, h) => new Date(`${day}T${String(h).padStart(2, "0")}:00:00.000Z`).getTime();
const buffer = booking.CLEANING_BUFFER_HOURS * 3600000;
const days = availability.daysInRange({ start: "2027-03-01", end: "2027-03-14" });
let pairs = 0;
for (const s of days) for (const e of days) {
  if (e <= s) continue;
  const heldSet = availability.blockedDaySet([{ start: s, end: e }]);
  for (const a of days) for (const d of days) {
    if (d <= a) continue;
    const serverConflict = hour(a, booking.CHECK_IN_HOUR) < hour(e, booking.CHECK_OUT_HOUR) + buffer && hour(d, booking.CHECK_OUT_HOUR) > hour(s, booking.CHECK_IN_HOUR) - buffer;
    assert.equal(!availability.rangeIsFree(heldSet, a, d), serverConflict, `calendar and server agree for held ${s}..${e}, new ${a}..${d}`);
    pairs++;
  }
}
console.log(`calendar matches the server conflict rule on ${pairs} stay pairs`);

const open = new Set(["2027-03-20"]);
assert.deepEqual(availability.nextSelection("", "", "2027-03-02", open), { start: "2027-03-02", end: "", blockedRange: false }, "first tap sets arrival");
assert.deepEqual(availability.nextSelection("2027-03-02", "", "2027-03-05", open), { start: "2027-03-02", end: "2027-03-05", blockedRange: false }, "second tap sets departure");
assert.deepEqual(availability.nextSelection("2027-03-02", "2027-03-05", "2027-03-09", open), { start: "2027-03-09", end: "", blockedRange: false }, "a tap after a full stay starts over");
assert.deepEqual(availability.nextSelection("2027-03-05", "", "2027-03-03", open), { start: "2027-03-03", end: "", blockedRange: false }, "tapping before the arrival moves the arrival");
assert.deepEqual(availability.nextSelection("2027-03-05", "", "2027-03-05", open), { start: "2027-03-05", end: "", blockedRange: false }, "tapping the arrival again keeps it");
assert.deepEqual(availability.nextSelection("2027-03-15", "", "2027-03-22", open), { start: "2027-03-22", end: "", blockedRange: true }, "a stay across a booked day is refused and restarts");

let seenWhere;
const fakeDb = { cabinInquiry: { findMany: async (args) => { seenWhere = args; return [
  { cabinId: "A", startDate: new Date("2027-03-05T13:00:00.000Z"), endDate: new Date("2027-03-08T12:00:00.000Z") },
  { cabinId: "A", startDate: new Date("2027-04-01T13:00:00.000Z"), endDate: new Date("2027-04-03T12:00:00.000Z") },
  { cabinId: "B", startDate: new Date("2027-03-07T13:00:00.000Z"), endDate: new Date("2027-03-09T12:00:00.000Z") },
]; } } };
const fetched = await availability.getBlockedRanges(fakeDb, new Date("2027-03-01T00:00:00Z"));
assert.deepEqual(fetched, { A: [{ start: "2027-03-05", end: "2027-03-08" }, { start: "2027-04-01", end: "2027-04-03" }], B: [{ start: "2027-03-07", end: "2027-03-09" }] }, "blocked ranges are date-only, grouped by cabin");
assert.deepEqual(seenWhere.where.inquiry.status.in, booking.BLOCKING_STATUSES, "calendar blocks on the same statuses as the conflict check");
assert.deepEqual(booking.bookingConflictWhere(["A"], new Date(), new Date()).inquiry.status.in, booking.BLOCKING_STATUSES);
assert.deepEqual(Object.keys(seenWhere.select).sort(), ["cabinId", "endDate", "startDate"], "calendar query selects no guest data");
assert.ok(!JSON.stringify(fetched).match(/customer|email|name|phone/i), "public payload carries no guest details");

// --- Confirm-from-email tokens --------------------------------------------
process.env.NEXTAUTH_SECRET = "unit-test-secret";
const now = Date.parse("2027-01-10T12:00:00Z");
const token = actions.createConfirmToken("inq_123", now);
assert.deepEqual(actions.verifyConfirmToken(token, now + 1000), { ok: true, inquiryId: "inq_123" }, "a fresh token verifies");
assert.equal(actions.verifyConfirmToken(token, now + actions.CONFIRM_LINK_TTL_MS + 1).code, "CONFIRM_LINK_EXPIRED", "tokens expire after 7 days");
assert.equal(actions.verifyConfirmToken(token, now + actions.CONFIRM_LINK_TTL_MS - 1).ok, true, "and are valid right up to the expiry");
const [payload, sig] = token.split(".");
const forged = Buffer.from(JSON.stringify({ id: "inq_OTHER", exp: now + 1e9 })).toString("base64url");
assert.equal(actions.verifyConfirmToken(`${forged}.${sig}`, now).code, "CONFIRM_LINK_INVALID", "changing the request id breaks the signature");
assert.equal(actions.verifyConfirmToken(`${payload}.${sig.slice(0, -2)}AA`, now).code, "CONFIRM_LINK_INVALID", "a bad signature is rejected");
for (const bad of ["", "abc", "a.b.c", undefined, null, 42, "x".repeat(700), `${payload}.`, `.${sig}`]) assert.equal(actions.verifyConfirmToken(bad, now).ok, false, `garbage token rejected: ${String(bad).slice(0, 20)}`);
process.env.NEXTAUTH_SECRET = "a-different-secret";
assert.equal(actions.verifyConfirmToken(token, now).code, "CONFIRM_LINK_INVALID", "a token from another secret is rejected");
delete process.env.NEXTAUTH_SECRET;
assert.equal(actions.verifyConfirmToken(token, now).ok, false, "no secret configured fails closed");
assert.throws(() => actions.createConfirmToken("x"), /NEXTAUTH_SECRET/, "cannot mint a token without a secret");
assert.ok(actions.confirmLinkPath("a.b").startsWith("/admin/confirm?token="));

// Admin alert email carries the link (and only when it can work).
const stay = { cabinName: "Cabin 1", startDate: new Date("2027-03-05T13:00:00.000Z"), endDate: new Date("2027-03-08T12:00:00.000Z") };
const guest = { customerName: "Guest", customerEmail: "guest@example.test", customerPhone: "+1 555 0100", requestNumber: 7, stays: [stay] };
process.env.ADMIN_ALERT_EMAILS = "owner@example.test";
process.env.NEXTAUTH_URL = "https://site.example.test";
process.env.NEXTAUTH_SECRET = "unit-test-secret";
const alert = email.buildAdminNewRequestEmail({ ...guest, inquiryId: "inq_9" });
const href = alert.html.match(/href="(https:\/\/site\.example\.test\/admin\/confirm\?token=[^"]+)"/)?.[1];
assert.ok(href, "admin alert has a Review and approve link");
assert.ok(alert.html.includes("Nothing changes until you press Confirm"), "alert says opening the link changes nothing");
assert.equal(actions.verifyConfirmToken(decodeURIComponent(new URL(href.replace(/&amp;/g, "&")).searchParams.get("token"))).inquiryId, "inq_9", "the link's token is for this request");
assert.match(alert.text, /Review and approve .*https:\/\/site\.example\.test\/admin\/confirm\?token=/, "plain-text part carries the link too");
assert.ok(alert.html.includes("/admin") && alert.html.includes("Review in the admin dashboard"), "dashboard link stays");
assert.ok(!email.buildAdminNewRequestEmail(guest).html.includes("/admin/confirm"), "no link without a request id");
delete process.env.NEXTAUTH_SECRET;
assert.ok(!email.buildAdminNewRequestEmail({ ...guest, inquiryId: "inq_9" }).html.includes("/admin/confirm"), "no link when signing is not configured");
const guestMail = email.buildRequestReceivedEmail({ ...guest, inquiryId: "inq_9" });
assert.ok(!guestMail.html.includes("confirm?token") && !guestMail.text.includes("confirm?token"), "guest emails never carry the approval link");

// --- WhatsApp link ---------------------------------------------------------
assert.equal(whatsapp.whatsappLink("+52 614 123 4567", "Hola #12"), "https://wa.me/526141234567?text=Hola%20%2312", "digits only, message encoded");
assert.equal(whatsapp.whatsappLink("", "x"), "", "no number, no link");
assert.equal(whatsapp.whatsappLink("123", "x"), "", "too-short numbers are rejected");
assert.equal(whatsapp.whatsappLink("1".repeat(16), "x"), "", "too-long numbers are rejected");
delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
assert.equal(whatsapp.whatsappNumber(), "", "unset env var means no link");
process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "+52 (614) 123-4567";
assert.equal(whatsapp.whatsappNumber(), "526141234567");

// --- Social preview images ---------------------------------------------------
assert.equal(seo.ogImageUrl("/x.jpg"), "https://cabanascorona.vercel.app/x.jpg", "relative images become absolute");
const og = new URL(seo.ogImageUrl("https://images.unsplash.com/photo-1?auto=format&fit=crop&w=2200&q=90"));
assert.deepEqual([og.searchParams.get("w"), og.searchParams.get("h"), og.searchParams.get("fit")], ["1200", "630", "crop"], "Unsplash images are cropped to 1200x630");
assert.equal(seo.ogImageUrl("https://abc.public.blob.vercel-storage.com/c/1.jpg"), "https://abc.public.blob.vercel-storage.com/c/1.jpg", "uploaded photos are used as-is");

// --- Gallery ---------------------------------------------------------------
const img = (url, type, sort_order) => ({ id: url, url, type, cabinId: "c", sort_order });
const real = gallery.galleryPhotos("Cabaña Grande", [img("u2", "Bedroom1", 2), img("u3", "Kitchen", 3), img("u1", "Primary", 9), img("u4", "Other", 1)]);
assert.deepEqual(real.map((p) => p.url), ["u1", "u4", "u2", "u3"], "Primary first, then admin order");
assert.ok(real.every((p) => !p.isPlaceholder), "real photos are never labeled temporary");
const placeholders = await load("placeholders");
const none2 = gallery.galleryPhotos("Cabaña Grande", []);
assert.equal(none2.length, gallery.MIN_GALLERY_PHOTOS, "no uploads: filled from the cabin's own photos");
assert.ok(none2.every((p) => !p.isPlaceholder && p.url.startsWith("/photos/cabana-grande-")), "fill photos are the cabin's own real photos, not temporary placeholders");
assert.equal(new Set(none2.map((p) => p.url)).size, none2.length, "no duplicate photos");
const one = gallery.galleryPhotos("Cabaña Mediana", [img("real", "Primary", 0)]);
assert.equal(one[0].url, "real");
assert.equal(one[0].isPlaceholder, false);
assert.ok(one.slice(1).every((p) => !p.isPlaceholder && p.url.startsWith("/photos/cabana-mediana-")) && one.length === gallery.MIN_GALLERY_PHOTOS, "one upload is topped up from the cabin's own photos");
assert.equal(gallery.galleryPhotos("Cabaña Desconocida", []).length >= 1, true, "unknown cabin name still gets a gallery");
for (const name of ["Cabaña Grande", "Cabaña Mediana", "Cabaña Pequeña"]) {
  assert.ok(placeholders.CABIN_PHOTOS[name]?.length >= gallery.MIN_GALLERY_PHOTOS, `${name} has a full photo set`);
  assert.ok(placeholders.CABIN_OG_PHOTOS[name], `${name} has a share-card image`);
  assert.ok(placeholders.CABIN_PHOTOS[name].every((p) => !p.temporary), `${name}'s photos are real, not placeholders`);
}
// No real palapa photo yet: it stays on labeled temporary placeholders.
assert.ok(placeholders.CABIN_PHOTOS["Palapa"].length >= gallery.MIN_GALLERY_PHOTOS, "Palapa keeps a full placeholder set");
assert.ok(placeholders.CABIN_PHOTOS["Palapa"].every((p) => p.temporary), "Palapa's photos are labeled temporary");
assert.ok(gallery.galleryPhotos("Palapa", []).every((p) => p.isPlaceholder), "Palapa gallery shows labeled placeholders");

// --- Wiring ----------------------------------------------------------------
const read = (f) => fs.readFileSync(f, "utf8");
const flow = read("components/BookingFlow.tsx");
assert.match(flow, /<AvailabilityCalendar /, "booking form shows the availability calendar");
assert.match(flow, /whatsappLink\(/, "confirmation screen has the WhatsApp link");
assert.match(read("pages/customer/bookings.tsx"), /waHref\(/, "status page has the WhatsApp link");
assert.match(read("pages/p/[id].tsx"), /<CabinGallery /, "cabin page shows the gallery");
assert.match(read("pages/p/[id].tsx"), /image=\{photo\.ogUrl\}/, "cabin page shares its own share-card image");
assert.match(read("pages/api/bookings/calendar.ts"), /req\.method !== "GET"/, "calendar endpoint is read-only");
assert.doesNotMatch(read("pages/api/bookings/calendar.ts"), /requireAdmin|session/, "calendar endpoint is public");
const confirmApi = read("pages/api/admin/bookings/email-confirm.ts");
assert.match(confirmApi, /verifyConfirmToken/, "confirm endpoint verifies the signed token");
assert.match(confirmApi, /if \(!\(await requireAdmin\(req, res\)\)\) return;/, "confirm endpoint requires a signed-in admin before anything else");
assert.ok(confirmApi.indexOf("requireAdmin(req, res)") < confirmApi.indexOf("verifyConfirmToken("), "admin check runs before the token is even read");
assert.match(read("pages/admin/confirm.tsx"), /sessionStatus === "unauthenticated"/, "confirm page asks signed-out visitors to sign in first");
assert.match(confirmApi, /changeBookingStatus\(inquiry\.id, "SCHEDULED"\)/, "confirm uses the shared status change (availability recheck, calendar, guest email)");
assert.match(confirmApi, /inquiry\.status !== "PENDING"/, "only pending requests can be approved from email");
assert.match(confirmApi, /req\.method === "GET"\) return res\.json/, "GET only describes the request");
assert.match(read("pages/api/bookings/index.ts"), /inquiryId: result\.id/, "new-request alert gets the request id for the link");
assert.match(read("pages/admin/confirm.tsx"), /t\.admin\.confirmEmail/, "confirm page is localized");
assert.match(read(".env.example"), /NEXT_PUBLIC_WHATSAPP_NUMBER/, ".env.example documents the WhatsApp number");
assert.ok(!/\d{10,}/.test(read("lib/whatsapp.ts")), "no phone number hardcoded");

fs.rmSync(out, { recursive: true, force: true });
console.log("feature checks passed");
