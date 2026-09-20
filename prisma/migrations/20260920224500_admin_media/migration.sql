-- Phase 2: bilingual admin-managed descriptions and ordered cabin media.
ALTER TABLE "Cabin"
  ADD COLUMN "description_es" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "description_en" TEXT NOT NULL DEFAULT '';

UPDATE "Cabin" SET
  "description_es" = CASE "name"
    WHEN 'Cabaña Grande' THEN 'Perfecta para grupos grandes. Incluye cocina, baño, terraza y calentón de leña.'
    WHEN 'Cabaña Mediana' THEN 'Una opción equilibrada para familias pequeñas o grupos de amigos.'
    WHEN 'Cabaña Pequeña' THEN 'La opción más íntima, ideal para una pareja o una estancia tranquila.'
    ELSE "description"
  END,
  "description_en" = CASE "name"
    WHEN 'Cabaña Grande' THEN 'Ideal for larger groups. Includes a kitchen, bathroom, terrace, and wood-burning stove.'
    WHEN 'Cabaña Mediana' THEN 'A balanced option for small families or friend groups.'
    WHEN 'Cabaña Pequeña' THEN 'The most intimate option, ideal for a couple or a quiet stay.'
    ELSE "description"
  END;

ALTER TABLE "CabinImage"
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "blob_pathname" TEXT;

CREATE INDEX "CabinImage_cabinId_sort_order_idx" ON "CabinImage"("cabinId", "sort_order");
CREATE UNIQUE INDEX "CabinImage_blob_pathname_key" ON "CabinImage"("blob_pathname");
