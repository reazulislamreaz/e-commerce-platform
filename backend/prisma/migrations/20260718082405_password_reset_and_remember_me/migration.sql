-- AlterEnum
ALTER TYPE "VerificationTokenType" ADD VALUE 'PASSWORD_RESET';

-- AlterTable
ALTER TABLE "auth_session" ADD COLUMN     "rememberMe" BOOLEAN NOT NULL DEFAULT false;
