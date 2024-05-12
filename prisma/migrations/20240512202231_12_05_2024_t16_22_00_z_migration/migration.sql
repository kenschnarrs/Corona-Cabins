/*
  Warnings:

  - The values [Bedroom] on the enum `PictureType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PictureType_new" AS ENUM ('Primary', 'LivingRoom', 'Bedroom1', 'Bedroom2', 'Bedroom3', 'Kitchen', 'Bathroom', 'DiningRoom', 'Balcony', 'Outside', 'Other');
ALTER TABLE "CabinImage" ALTER COLUMN "type" TYPE "PictureType_new" USING ("type"::text::"PictureType_new");
ALTER TYPE "PictureType" RENAME TO "PictureType_old";
ALTER TYPE "PictureType_new" RENAME TO "PictureType";
DROP TYPE "PictureType_old";
COMMIT;
