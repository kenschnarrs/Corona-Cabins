-- Human-friendly sequential request number guests can quote, e.g. "#1042".
-- The cuid stays the internal key; the sequence makes concurrent submits safe.
CREATE SEQUENCE inquiry_request_number_seq START 1000;
ALTER TABLE "Inquiry" ADD COLUMN "request_number" INTEGER NOT NULL DEFAULT nextval('inquiry_request_number_seq');
ALTER SEQUENCE inquiry_request_number_seq OWNED BY "Inquiry"."request_number";
CREATE UNIQUE INDEX "Inquiry_request_number_key" ON "Inquiry"("request_number");
