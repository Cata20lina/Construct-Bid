-- CreateTable
CREATE TABLE "clarificari" (
    "id" TEXT NOT NULL,
    "intrebare" TEXT NOT NULL,
    "raspuns" TEXT,
    "raspunsLa" TIMESTAMP(3),
    "proiectId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarificari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clarificari_proiectId_createdAt_idx" ON "clarificari"("proiectId", "createdAt");

-- AddForeignKey
ALTER TABLE "clarificari" ADD CONSTRAINT "clarificari_proiectId_fkey" FOREIGN KEY ("proiectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarificari" ADD CONSTRAINT "clarificari_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
