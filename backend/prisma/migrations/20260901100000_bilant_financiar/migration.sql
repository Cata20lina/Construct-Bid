-- Situație financiară preluată de la ANAF (bilanț anual), afișată public pe
-- profilul firmei ca semnal de încredere pentru cei care decid dacă acceptă
-- o ofertă. Toate coloanele sunt opționale — rămân NULL până la prima
-- verificare, și pot rămâne NULL dacă firma nu a depus încă niciun bilanț
-- (ex: firme foarte noi).
ALTER TABLE "users" ADD COLUMN "bilantAn" INTEGER;
ALTER TABLE "users" ADD COLUMN "bilantCifraAfaceri" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "bilantProfitNet" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "bilantPierdereNeta" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "bilantNumarAngajati" INTEGER;
ALTER TABLE "users" ADD COLUMN "bilantVerificatLa" TIMESTAMP(3);
