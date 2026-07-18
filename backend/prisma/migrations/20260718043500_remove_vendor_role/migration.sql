-- Remove VENDOR from the Role enum. PostgreSQL cannot drop an enum value in
-- place, so any VENDOR accounts are reassigned to CUSTOMER and the type is
-- rebuilt without the value.
UPDATE "User" SET "role" = 'CUSTOMER' WHERE "role" = 'VENDOR';

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CUSTOMER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" SET DATA TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
DROP TYPE "Role_old";
