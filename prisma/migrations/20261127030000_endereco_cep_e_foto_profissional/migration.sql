-- Endereço em partes (preenchido pelo CEP) e foto do profissional
ALTER TABLE "Business" ADD COLUMN "zipCode" TEXT,
ADD COLUMN "street" TEXT,
ADD COLUMN "addressNumber" TEXT,
ADD COLUMN "complement" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT;

ALTER TABLE "Professional" ADD COLUMN "imageId" TEXT;
