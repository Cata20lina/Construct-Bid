-- Chat de suport: un fir de conversație per utilizator, cu echipa (adminii)
CREATE TYPE "StatusConversatieSuport" AS ENUM ('deschisa', 'rezolvata');

CREATE TABLE "conversatii_suport" (
    "id" TEXT NOT NULL,
    "status" "StatusConversatieSuport" NOT NULL DEFAULT 'deschisa',
    "userId" TEXT NOT NULL,
    "cititUserLa" TIMESTAMP(3),
    "cititAdminLa" TIMESTAMP(3),
    "ultimulMesajLa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversatii_suport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mesaje_suport" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "conversatieId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "deLaSuport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mesaje_suport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversatii_suport_userId_key" ON "conversatii_suport"("userId");
CREATE INDEX "conversatii_suport_status_ultimulMesajLa_idx" ON "conversatii_suport"("status", "ultimulMesajLa");
CREATE INDEX "mesaje_suport_conversatieId_createdAt_idx" ON "mesaje_suport"("conversatieId", "createdAt");

ALTER TABLE "conversatii_suport" ADD CONSTRAINT "conversatii_suport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mesaje_suport" ADD CONSTRAINT "mesaje_suport_conversatieId_fkey" FOREIGN KEY ("conversatieId") REFERENCES "conversatii_suport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mesaje_suport" ADD CONSTRAINT "mesaje_suport_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
