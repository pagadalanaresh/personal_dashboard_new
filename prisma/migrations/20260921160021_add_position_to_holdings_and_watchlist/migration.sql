-- CreateEnum
CREATE TYPE "PositionType" AS ENUM ('SHORT', 'LONG');

-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "position" "PositionType" NOT NULL DEFAULT 'SHORT';

-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN     "position" "PositionType" NOT NULL DEFAULT 'SHORT';
