/*
  Warnings:

  - Added the required column `name` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_userId_symbol_idx" ON "Transaction"("userId", "symbol");
