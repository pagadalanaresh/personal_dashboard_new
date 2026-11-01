
-- CreateEnum
CREATE TYPE "Market" AS ENUM ('NSE', 'US');

-- DropIndex
DROP INDEX "Holding_userId_symbol_key";

-- DropIndex
DROP INDEX "WatchlistItem_userId_symbol_key";

-- DropIndex
DROP INDEX "WatchlistSection_userId_name_key";

-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "market" "Market" NOT NULL DEFAULT 'NSE';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "market" "Market" NOT NULL DEFAULT 'NSE';

-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN     "market" "Market" NOT NULL DEFAULT 'NSE';

-- AlterTable
ALTER TABLE "WatchlistSection" ADD COLUMN     "market" "Market" NOT NULL DEFAULT 'NSE';

-- CreateIndex
CREATE INDEX "Holding_userId_market_idx" ON "Holding"("userId", "market");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_symbol_market_key" ON "Holding"("userId", "symbol", "market");

-- CreateIndex
CREATE INDEX "Transaction_userId_market_idx" ON "Transaction"("userId", "market");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_market_idx" ON "WatchlistItem"("userId", "market");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_symbol_market_key" ON "WatchlistItem"("userId", "symbol", "market");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistSection_userId_name_market_key" ON "WatchlistSection"("userId", "name", "market");

