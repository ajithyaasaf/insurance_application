/*
  Warnings:

  - The values [fire,marine,travel,property,liability] on the enum `PolicyType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PolicyType_new" AS ENUM ('motor', 'health', 'life', 'other');
ALTER TABLE "Policy" ALTER COLUMN "policyType" TYPE "PolicyType_new" USING ("policyType"::text::"PolicyType_new");
ALTER TYPE "PolicyType" RENAME TO "PolicyType_old";
ALTER TYPE "PolicyType_new" RENAME TO "PolicyType";
DROP TYPE "public"."PolicyType_old";
COMMIT;
