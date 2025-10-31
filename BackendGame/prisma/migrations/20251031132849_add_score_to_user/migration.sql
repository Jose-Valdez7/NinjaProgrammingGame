/*
  Warnings:

  - You are about to drop the column `score` on the `rankings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "rankings_level_score_idx";

-- AlterTable
ALTER TABLE "rankings" DROP COLUMN "score";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "rankings_level_idx" ON "rankings"("level");
