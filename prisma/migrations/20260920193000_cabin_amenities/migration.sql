-- Phase 1: amenity flags that feed the cabin cards on the public site.
-- Additive only; existing columns, rows, and deployed code are unaffected.
ALTER TABLE "Cabin"
  ADD COLUMN "has_kitchen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "has_wood_stove" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "has_terrace" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from the property facts in the README / approved mockup:
-- every cabin has an equipped kitchen and a wood-burning stove;
-- the Medium cabin has no terrace.
UPDATE "Cabin" SET "has_kitchen" = true, "has_wood_stove" = true, "has_terrace" = true
  WHERE "name" = 'Cabaña Grande';
UPDATE "Cabin" SET "has_kitchen" = true, "has_wood_stove" = true
  WHERE "name" = 'Cabaña Mediana';
UPDATE "Cabin" SET "has_kitchen" = true, "has_wood_stove" = true, "has_terrace" = true
  WHERE "name" = 'Cabaña Pequeña';
