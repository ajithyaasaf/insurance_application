-- CreateEnum
CREATE TYPE "PolicyVehicleClass" AS ENUM ('TW', 'CVP', 'PVT', 'GCV', 'Misc_D', 'CCP', 'Fire', 'Public_Liability', 'Others');

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "dealerId" TEXT,
ADD COLUMN     "idv" DOUBLE PRECISION,
ADD COLUMN     "make" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "od" DOUBLE PRECISION,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "tax" DOUBLE PRECISION,
ADD COLUMN     "totalPremium" DOUBLE PRECISION,
ADD COLUMN     "tp" DOUBLE PRECISION,
ADD COLUMN     "vehicleClass" "PolicyVehicleClass";

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dealer_userId_idx" ON "Dealer"("userId");

-- CreateIndex
CREATE INDEX "Dealer_name_idx" ON "Dealer"("name");

-- AddForeignKey
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
