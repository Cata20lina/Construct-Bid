-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "suspendat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivSuspendare" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "modificariTrimiseLa" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cereri_materiale" ADD COLUMN     "suspendat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivSuspendare" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "modificariTrimiseLa" TIMESTAMP(3);
