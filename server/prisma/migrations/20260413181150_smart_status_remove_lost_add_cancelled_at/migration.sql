/*
  Warnings:

  - The values [lost] on the enum `PolicyStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `lostReason` on the `Policy` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PolicyStatus_new" AS ENUM ('active', 'expired', 'cancelled');
ALTER TABLE "public"."Policy" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Policy" ALTER COLUMN "status" TYPE "PolicyStatus_new" USING ("status"::text::"PolicyStatus_new");
ALTER TYPE "PolicyStatus" RENAME TO "PolicyStatus_old";
ALTER TYPE "PolicyStatus_new" RENAME TO "PolicyStatus";
DROP TYPE "public"."PolicyStatus_old";
ALTER TABLE "Policy" ALTER COLUMN "status" SET DEFAULT 'active';
COMMIT;

-- AlterTable
ALTER TABLE "Policy" DROP COLUMN "lostReason",
ADD COLUMN     "cancelledAt" TIMESTAMP(3);
