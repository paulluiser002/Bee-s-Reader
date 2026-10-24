-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'mangadex',
    "mangaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'mangadex',
    "mangaId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL DEFAULT 0,
    "scrollFraction" REAL NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReaderPreference" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'local',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "mode" TEXT NOT NULL DEFAULT 'long',
    "pageWidthPercent" INTEGER NOT NULL DEFAULT 100,
    "quality" TEXT NOT NULL DEFAULT 'data-saver',
    "autoNext" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_provider_mangaId_key" ON "Bookmark"("provider", "mangaId");

-- CreateIndex
CREATE INDEX "ReadingProgress_mangaId_updatedAt_idx" ON "ReadingProgress"("mangaId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_provider_chapterId_key" ON "ReadingProgress"("provider", "chapterId");
