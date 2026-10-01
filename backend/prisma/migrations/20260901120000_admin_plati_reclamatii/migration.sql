-- Rol ADMIN + status pentru reclamații
ALTER TYPE "Rol" ADD VALUE 'ADMIN';

CREATE TYPE "StatusReclamatie" AS ENUM ('deschisa', 'in_lucru', 'rezolvata', 'respinsa');

-- Suspendare cont (moderare de către un admin)
ALTER TABLE "users" ADD COLUMN "suspendat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "suspendatMotiv" TEXT NOT NULL DEFAULT '';

-- Plată reală prin Stripe pe tranzacțiile de tokenuri
ALTER TABLE "tranzactii_tokenuri" ADD COLUMN "stripeSessionId" TEXT;
ALTER TABLE "tranzactii_tokenuri" ADD COLUMN "stripePaymentStatus" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "tranzactii_tokenuri_stripeSessionId_key" ON "tranzactii_tokenuri"("stripeSessionId");

-- Facturi — numerotare secvențială (SERIAL / autoincrement Postgres)
CREATE TABLE "facturi" (
    "numar" SERIAL NOT NULL,
    "serie" TEXT NOT NULL DEFAULT 'CB',
    "suma" DOUBLE PRECISION NOT NULL,
    "descriere" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tranzactieId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturi_pkey" PRIMARY KEY ("numar")
);

CREATE UNIQUE INDEX "facturi_tranzactieId_key" ON "facturi"("tranzactieId");

ALTER TABLE "facturi" ADD CONSTRAINT "facturi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facturi" ADD CONSTRAINT "facturi_tranzactieId_fkey" FOREIGN KEY ("tranzactieId") REFERENCES "tranzactii_tokenuri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reclamații
CREATE TABLE "reclamatii" (
    "id" TEXT NOT NULL,
    "motiv" TEXT NOT NULL,
    "descriere" TEXT NOT NULL DEFAULT '',
    "status" "StatusReclamatie" NOT NULL DEFAULT 'deschisa',
    "raspunsAdmin" TEXT NOT NULL DEFAULT '',
    "proiectId" TEXT,
    "ofertaId" TEXT,
    "raportatDeId" TEXT NOT NULL,
    "raportatImpotrivaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reclamatii_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reclamatii_status_createdAt_idx" ON "reclamatii"("status", "createdAt");

ALTER TABLE "reclamatii" ADD CONSTRAINT "reclamatii_raportatDeId_fkey" FOREIGN KEY ("raportatDeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reclamatii" ADD CONSTRAINT "reclamatii_raportatImpotrivaId_fkey" FOREIGN KEY ("raportatImpotrivaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
