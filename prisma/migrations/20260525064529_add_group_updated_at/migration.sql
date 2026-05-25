/*
  Warnings:

  - Added the required column `updatedAt` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add updatedAt with NOW() as default for existing rows
ALTER TABLE "Group" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
-- Remove the default so Prisma manages it going forward
ALTER TABLE "Group" ALTER COLUMN "updatedAt" DROP DEFAULT;
