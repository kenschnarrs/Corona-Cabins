-- Price update (pesos per night) and a separate Palapa entry.
UPDATE "Cabin" SET "price_per_night" = 2500 WHERE "name" = 'Cabaña Grande';
UPDATE "Cabin" SET "price_per_night" = 2000 WHERE "name" = 'Cabaña Mediana';
UPDATE "Cabin" SET "price_per_night" = 1500 WHERE "name" = 'Cabaña Pequeña';

-- Palapa: its own row. It is the property's event space, not a lodging unit,
-- so room/bed/bath counts are 0 (N/A). Description approved by Ken.
INSERT INTO "Cabin" ("id", "name", "num_bathrooms", "num_bedrooms", "num_beds", "num_floors", "square_feet", "price_per_night", "description", "description_es", "description_en")
SELECT gen_random_uuid()::text, 'Palapa', 0, 0, 0, 0, 0, 3000, 'Nuestra palapa es el lugar de eventos de la propiedad, ideal para reuniones, celebraciones y convivios en familia o con amigos. Pregunta por disponibilidad y detalles.', 'Nuestra palapa es el lugar de eventos de la propiedad, ideal para reuniones, celebraciones y convivios en familia o con amigos. Pregunta por disponibilidad y detalles.', 'Our palapa is the property''s event space, ideal for gatherings, celebrations, and get-togethers with family or friends. Ask about availability and details.'
WHERE NOT EXISTS (SELECT 1 FROM "Cabin" WHERE "name" = 'Palapa');
