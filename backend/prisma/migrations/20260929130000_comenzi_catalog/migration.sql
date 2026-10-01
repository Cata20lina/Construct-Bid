-- Comenzi directe pe produse de catalog — cumpărătorul comandă direct la
-- furnizorul care a listat produsul, la prețul afișat; nu e o licitație.

CREATE TYPE "StatusComandaCatalog" AS ENUM ('in_asteptare', 'confirmata', 'refuzata', 'anulata');

CREATE TABLE "comenzi_catalog" (
    "id" TEXT NOT NULL,
    "denumireProdus" TEXT NOT NULL,
    "pretUnitar" DOUBLE PRECISION NOT NULL,
    "unitateMasura" TEXT NOT NULL DEFAULT 'buc',
    "cantitate" DOUBLE PRECISION NOT NULL,
    "mesaj" TEXT NOT NULL DEFAULT '',
    "status" "StatusComandaCatalog" NOT NULL DEFAULT 'in_asteptare',
    "motivRefuz" TEXT NOT NULL DEFAULT '',
    "produsId" TEXT,
    "cumparatorId" TEXT NOT NULL,
    "furnizorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comenzi_catalog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comenzi_catalog_furnizorId_status_idx" ON "comenzi_catalog"("furnizorId", "status");
CREATE INDEX "comenzi_catalog_cumparatorId_status_idx" ON "comenzi_catalog"("cumparatorId", "status");

ALTER TABLE "comenzi_catalog" ADD CONSTRAINT "comenzi_catalog_produsId_fkey" FOREIGN KEY ("produsId") REFERENCES "lucrari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comenzi_catalog" ADD CONSTRAINT "comenzi_catalog_cumparatorId_fkey" FOREIGN KEY ("cumparatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comenzi_catalog" ADD CONSTRAINT "comenzi_catalog_furnizorId_fkey" FOREIGN KEY ("furnizorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
