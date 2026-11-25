-- Guest's site language at booking time ("es" or "en"), so every guest email
-- goes out in one language instead of a bilingual message. Existing requests
-- default to Spanish, the site's default language.
ALTER TABLE "Inquiry" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es';
