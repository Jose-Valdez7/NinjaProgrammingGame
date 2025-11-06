-- CreateIndex
CREATE INDEX "rankings_userId_idx" ON "rankings"("userId");

-- CreateIndex
CREATE INDEX "rankings_userId_level_idx" ON "rankings"("userId", "level");
