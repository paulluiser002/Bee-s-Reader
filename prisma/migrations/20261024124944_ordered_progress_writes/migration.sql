-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReadingProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'mangadex',
    "mangaId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL DEFAULT 0,
    "scrollFraction" REAL NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ReadingProgress" ("chapterId", "completed", "id", "mangaId", "pageIndex", "provider", "scrollFraction", "updatedAt") SELECT "chapterId", "completed", "id", "mangaId", "pageIndex", "provider", "scrollFraction", "updatedAt" FROM "ReadingProgress";
DROP TABLE "ReadingProgress";
ALTER TABLE "new_ReadingProgress" RENAME TO "ReadingProgress";
CREATE INDEX "ReadingProgress_mangaId_updatedAt_idx" ON "ReadingProgress"("mangaId", "updatedAt");
CREATE UNIQUE INDEX "ReadingProgress_provider_chapterId_key" ON "ReadingProgress"("provider", "chapterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
