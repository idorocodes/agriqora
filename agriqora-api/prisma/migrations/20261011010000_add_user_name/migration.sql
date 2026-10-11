ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';

UPDATE "User"
SET "name" = COALESCE("data" ->> 'name', '')
WHERE "name" = '';