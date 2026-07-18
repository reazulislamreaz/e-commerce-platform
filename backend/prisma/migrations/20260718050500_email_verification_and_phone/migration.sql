-- 1. Rename UserStatus PENDING -> PENDING_VERIFICATION (account activation is
--    now driven exclusively by email verification).
ALTER TYPE "UserStatus" RENAME VALUE 'PENDING' TO 'PENDING_VERIFICATION';

-- 2. Email verification timestamp. Accounts created before this feature were
--    ACTIVE without verification, so they are grandfathered as verified.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3);
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "status" = 'ACTIVE';

-- 3. Mandatory unique Bangladeshi phone (E.164). Existing rows are backfilled
--    with unique syntactically-valid placeholders (+88013XXXXXXXX); real
--    numbers must be collected when a profile-update flow ships.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn FROM "User"
)
UPDATE "User" u
SET "phone" = '+88013' || LPAD(numbered.rn::text, 8, '0')
FROM numbered
WHERE u."id" = numbered."id";
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- 4. Single-use expiring verification tokens (hash-only storage).
CREATE TYPE "VerificationTokenType" AS ENUM ('EMAIL_VERIFICATION');

CREATE TABLE "verification_token" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "VerificationTokenType" NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verification_token_tokenHash_key" ON "verification_token"("tokenHash");
CREATE INDEX "verification_token_userId_type_idx" ON "verification_token"("userId", "type");

ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
