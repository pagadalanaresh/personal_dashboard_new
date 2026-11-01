-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "WatchlistSection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchlistSection_userId_idx" ON "WatchlistSection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistSection_userId_name_key" ON "WatchlistSection"("userId", "name");

-- CreateIndex
CREATE INDEX "WatchlistItem_sectionId_idx" ON "WatchlistItem"("sectionId");

-- AddForeignKey
ALTER TABLE "WatchlistSection" ADD CONSTRAINT "WatchlistSection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "WatchlistSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
