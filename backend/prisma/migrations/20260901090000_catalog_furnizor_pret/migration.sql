-- Câmpuri pentru catalogul de produse al unui FURNIZOR (preț + unitate de
-- măsură); rămân NULL pentru lucrările de portofoliu ale unui SUBCONTRACTOR.
ALTER TABLE "lucrari" ADD COLUMN "pret" DOUBLE PRECISION;
ALTER TABLE "lucrari" ADD COLUMN "unitateMasura" TEXT NOT NULL DEFAULT '';
