-- Cereri de materiale — flux separat pentru furnizori (nu mai licitează pe
-- proiecte de execuție). Vezi comentariile din schema.prisma.

CREATE TYPE "StatusCerere" AS ENUM ('deschisa', 'finalizata', 'anulata');

CREATE TABLE "cereri_materiale" (
    "id" TEXT NOT NULL,
    "titlu" TEXT NOT NULL,
    "descriere" TEXT NOT NULL DEFAULT '',
    "judet" TEXT NOT NULL,
    "oras" TEXT NOT NULL DEFAULT '',
    "termenLimita" TIMESTAMP(3),
    "status" "StatusCerere" NOT NULL DEFAULT 'deschisa',
    "proiectId" TEXT,
    "creatDeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cereri_materiale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cereri_materiale_status_createdAt_idx" ON "cereri_materiale"("status", "createdAt");
CREATE INDEX "cereri_materiale_judet_status_idx" ON "cereri_materiale"("judet", "status");

ALTER TABLE "cereri_materiale" ADD CONSTRAINT "cereri_materiale_proiectId_fkey" FOREIGN KEY ("proiectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cereri_materiale" ADD CONSTRAINT "cereri_materiale_creatDeId_fkey" FOREIGN KEY ("creatDeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cerere_articole" (
    "id" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "cantitate" DOUBLE PRECISION NOT NULL,
    "unitateMasura" TEXT NOT NULL DEFAULT 'buc',
    "specificatii" TEXT NOT NULL DEFAULT '',
    "cerereId" TEXT NOT NULL,
    "ofertaArticolCastigatoareId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cerere_articole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cerere_articole_ofertaArticolCastigatoareId_key" ON "cerere_articole"("ofertaArticolCastigatoareId");

ALTER TABLE "cerere_articole" ADD CONSTRAINT "cerere_articole_cerereId_fkey" FOREIGN KEY ("cerereId") REFERENCES "cereri_materiale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "oferte_materiale" (
    "id" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL DEFAULT '',
    "termenLivrare" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "cerereId" TEXT NOT NULL,
    "furnizorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oferte_materiale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oferte_materiale_cerereId_furnizorId_idx" ON "oferte_materiale"("cerereId", "furnizorId");

ALTER TABLE "oferte_materiale" ADD CONSTRAINT "oferte_materiale_cerereId_fkey" FOREIGN KEY ("cerereId") REFERENCES "cereri_materiale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oferte_materiale" ADD CONSTRAINT "oferte_materiale_furnizorId_fkey" FOREIGN KEY ("furnizorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "oferta_articole" (
    "id" TEXT NOT NULL,
    "pretUnitar" DOUBLE PRECISION NOT NULL,
    "cantitateOfertata" DOUBLE PRECISION,
    "acceptat" BOOLEAN NOT NULL DEFAULT false,
    "ofertaId" TEXT NOT NULL,
    "cerereArticolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oferta_articole_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oferta_articole_cerereArticolId_idx" ON "oferta_articole"("cerereArticolId");
CREATE INDEX "oferta_articole_ofertaId_idx" ON "oferta_articole"("ofertaId");

ALTER TABLE "oferta_articole" ADD CONSTRAINT "oferta_articole_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferte_materiale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oferta_articole" ADD CONSTRAINT "oferta_articole_cerereArticolId_fkey" FOREIGN KEY ("cerereArticolId") REFERENCES "cerere_articole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cerere_articole" ADD CONSTRAINT "cerere_articole_ofertaArticolCastigatoareId_fkey" FOREIGN KEY ("ofertaArticolCastigatoareId") REFERENCES "oferta_articole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
