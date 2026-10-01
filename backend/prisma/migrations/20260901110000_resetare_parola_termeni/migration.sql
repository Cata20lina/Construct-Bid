-- Resetare parolă uitată (cod din 6 cifre, ca la verificarea de email) +
-- data la care utilizatorul a acceptat Termenii și Confidențialitatea.
ALTER TABLE "users" ADD COLUMN "codResetareParola" TEXT;
ALTER TABLE "users" ADD COLUMN "codResetareParolaExpira" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "termeniAcceptatiLa" TIMESTAMP(3);
