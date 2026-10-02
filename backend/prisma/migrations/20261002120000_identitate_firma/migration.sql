-- CreateEnum
CREATE TYPE "StatusIdentitate" AS ENUM ('NECONFIRMATA', 'IN_VERIFICARE', 'CONFIRMATA', 'RESPINSA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "identitateCalitate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "identitateConfirmataDe" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "identitateConfirmataLa" TIMESTAMP(3),
ADD COLUMN     "identitateMetoda" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "identitateMotivRespingere" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "identitatePersoana" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "identitateStatus" "StatusIdentitate" NOT NULL DEFAULT 'NECONFIRMATA',
ADD COLUMN     "identitateTrimisaLa" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "documente_identitate" (
    "id" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "numeOriginal" TEXT NOT NULL,
    "numeFisier" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "marime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "documente_identitate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurnal_acces_documente" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "proprietarId" TEXT NOT NULL,
    "actiune" TEXT NOT NULL,
    "deCatreId" TEXT NOT NULL,
    "deCatreNume" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurnal_acces_documente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documente_identitate_numeFisier_key" ON "documente_identitate"("numeFisier");

-- CreateIndex
CREATE INDEX "documente_identitate_userId_idx" ON "documente_identitate"("userId");

-- CreateIndex
CREATE INDEX "jurnal_acces_documente_proprietarId_createdAt_idx" ON "jurnal_acces_documente"("proprietarId", "createdAt");

-- AddForeignKey
ALTER TABLE "documente_identitate" ADD CONSTRAINT "documente_identitate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
