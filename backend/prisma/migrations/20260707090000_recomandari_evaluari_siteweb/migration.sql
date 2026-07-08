-- AlterTable: câmpuri noi pe User (site de prezentare + rating agregat)
ALTER TABLE "users"
  ADD COLUMN "siteWeb" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "ratingMediu" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ratingNumarEvaluari" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "recomandari" (
    "id" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "valoareContract" DOUBLE PRECISION,
    "documentUrl" TEXT NOT NULL DEFAULT '',
    "documentNume" TEXT NOT NULL DEFAULT '',
    "descriere" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "recomandari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluari" (
    "id" TEXT NOT NULL,
    "scor" INTEGER NOT NULL,
    "comentariu" TEXT NOT NULL DEFAULT '',
    "proiectTitlu" TEXT NOT NULL DEFAULT '',
    "evaluatorNume" TEXT NOT NULL DEFAULT '',
    "ofertaId" TEXT NOT NULL,
    "proiectId" TEXT NOT NULL DEFAULT '',
    "evaluatorId" TEXT,
    "evaluatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recomandari_userId_createdAt_idx" ON "recomandari"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "evaluari_ofertaId_key" ON "evaluari"("ofertaId");

-- CreateIndex
CREATE INDEX "evaluari_evaluatId_createdAt_idx" ON "evaluari"("evaluatId", "createdAt");

-- AddForeignKey
ALTER TABLE "recomandari" ADD CONSTRAINT "recomandari_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluari" ADD CONSTRAINT "evaluari_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluari" ADD CONSTRAINT "evaluari_evaluatId_fkey" FOREIGN KEY ("evaluatId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
