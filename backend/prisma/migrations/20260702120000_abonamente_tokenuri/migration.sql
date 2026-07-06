-- CreateEnum
CREATE TYPE "PlanAbonament" AS ENUM ('GRATUIT', 'PRO', 'ENTERPRISE');

-- AlterTable: schimbăm valoarea implicită pentru tokenurile acordate la
-- înregistrare (aliniată cu pachetul lunar al planului GRATUIT), și adăugăm
-- coloanele pentru abonament.
ALTER TABLE "users"
  ALTER COLUMN "tokenuri" SET DEFAULT 20,
  ADD COLUMN "planAbonament" "PlanAbonament" NOT NULL DEFAULT 'GRATUIT',
  ADD COLUMN "ultimaAlocareTokenuri" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tranzactii_tokenuri" (
    "id" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "suma" INTEGER NOT NULL,
    "soldDupa" INTEGER NOT NULL,
    "descriere" TEXT NOT NULL DEFAULT '',
    "proiectId" TEXT,
    "ofertaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tranzactii_tokenuri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tranzactii_tokenuri_userId_createdAt_idx" ON "tranzactii_tokenuri"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "tranzactii_tokenuri" ADD CONSTRAINT "tranzactii_tokenuri_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
