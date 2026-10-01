-- Condiții de participare (opțional) pe proiect
ALTER TABLE "projects" ADD COLUMN "termenLimitaOferta" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "avansProcent" INTEGER;
ALTER TABLE "projects" ADD COLUMN "garantii" TEXT NOT NULL DEFAULT '';
ALTER TABLE "projects" ADD COLUMN "experientaMinima" TEXT NOT NULL DEFAULT '';
