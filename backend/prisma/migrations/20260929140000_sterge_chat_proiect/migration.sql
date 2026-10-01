-- Chat-ul pe proiect (dezvoltator ↔ ofertant câștigător) a fost scos din platformă
ALTER TABLE "mesaje" DROP CONSTRAINT "mesaje_expeditorId_fkey";
ALTER TABLE "mesaje" DROP CONSTRAINT "mesaje_proiectId_fkey";

DROP TABLE "mesaje";
