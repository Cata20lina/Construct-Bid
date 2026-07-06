-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUBCONTRACTOR', 'DEZVOLTATOR');

-- CreateEnum
CREATE TYPE "TipOfertare" AS ENUM ('statica', 'dinamica');

-- CreateEnum
CREATE TYPE "StatusOferta" AS ENUM ('in_asteptare', 'acceptata', 'respinsa', 'in_negociere', 'castigatoare', 'depasita');

-- CreateEnum
CREATE TYPE "TipNotificare" AS ENUM ('oferta', 'castigat', 'proiect', 'alerta');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "parola" TEXT NOT NULL,
    "nume" TEXT NOT NULL,
    "cui" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "judet" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'SUBCONTRACTOR',
    "verificat" BOOLEAN NOT NULL DEFAULT false,
    "tokenuri" INTEGER NOT NULL DEFAULT 50,
    "descriere" TEXT NOT NULL DEFAULT '',
    "aniExperienta" INTEGER,
    "nrAngajati" INTEGER,
    "categoriiServicii" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "judeteServicii" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cuiVerificat" BOOLEAN NOT NULL DEFAULT false,
    "cuiDenumireOficiala" TEXT NOT NULL DEFAULT '',
    "cuiVerificatLa" TIMESTAMP(3),
    "codVerificare" TEXT,
    "codVerificareExpira" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lucrari" (
    "id" TEXT NOT NULL,
    "titlu" TEXT NOT NULL,
    "descriere" TEXT NOT NULL DEFAULT '',
    "an" INTEGER,
    "categorie" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "lucrari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilitati" (
    "id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,

    CONSTRAINT "disponibilitati_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "titlu" TEXT NOT NULL,
    "descriere" TEXT NOT NULL,
    "locatie" TEXT NOT NULL,
    "judet" TEXT,
    "oras" TEXT,
    "buget" TEXT NOT NULL,
    "bugetValoare" DOUBLE PRECISION,
    "latitudine" DOUBLE PRECISION,
    "longitudine" DOUBLE PRECISION,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "zile" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),
    "categorie" TEXT NOT NULL DEFAULT 'rezidential',
    "esteProspectare" BOOLEAN NOT NULL DEFAULT false,
    "dezvoltatorId" TEXT NOT NULL,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "tipOfertare" "TipOfertare" NOT NULL DEFAULT 'statica',
    "licitatieStart" TIMESTAMP(3),
    "licitatieEnd" TIMESTAMP(3),
    "licitatieFinalizata" BOOLEAN NOT NULL DEFAULT false,
    "castigatorId" TEXT,
    "ofertaCastigatoareId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferte" (
    "id" TEXT NOT NULL,
    "valoare" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'RON',
    "descriere" TEXT NOT NULL DEFAULT '',
    "termenExecutie" INTEGER NOT NULL,
    "status" "StatusOferta" NOT NULL DEFAULT 'in_asteptare',
    "documente" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "proiectId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oferte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesaje" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proiectId" TEXT NOT NULL,
    "expeditorId" TEXT NOT NULL,

    CONSTRAINT "mesaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificari" (
    "id" TEXT NOT NULL,
    "tip" "TipNotificare" NOT NULL,
    "titlu" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "citita" BOOLEAN NOT NULL DEFAULT false,
    "proiectId" TEXT,
    "ofertaId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_ofertaCastigatoareId_key" ON "projects"("ofertaCastigatoareId");

-- CreateIndex
CREATE INDEX "oferte_proiectId_valoare_idx" ON "oferte"("proiectId", "valoare");

-- CreateIndex
CREATE INDEX "oferte_proiectId_subcontractorId_activa_idx" ON "oferte"("proiectId", "subcontractorId", "activa");

-- CreateIndex
CREATE INDEX "mesaje_proiectId_createdAt_idx" ON "mesaje"("proiectId", "createdAt");

-- CreateIndex
CREATE INDEX "notificari_userId_citita_createdAt_idx" ON "notificari"("userId", "citita", "createdAt");

-- AddForeignKey
ALTER TABLE "lucrari" ADD CONSTRAINT "lucrari_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilitati" ADD CONSTRAINT "disponibilitati_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_dezvoltatorId_fkey" FOREIGN KEY ("dezvoltatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_castigatorId_fkey" FOREIGN KEY ("castigatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_ofertaCastigatoareId_fkey" FOREIGN KEY ("ofertaCastigatoareId") REFERENCES "oferte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferte" ADD CONSTRAINT "oferte_proiectId_fkey" FOREIGN KEY ("proiectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferte" ADD CONSTRAINT "oferte_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesaje" ADD CONSTRAINT "mesaje_proiectId_fkey" FOREIGN KEY ("proiectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesaje" ADD CONSTRAINT "mesaje_expeditorId_fkey" FOREIGN KEY ("expeditorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificari" ADD CONSTRAINT "notificari_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
