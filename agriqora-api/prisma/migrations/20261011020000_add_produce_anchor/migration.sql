CREATE TABLE "ProduceAnchor" (
    "produceId" TEXT NOT NULL,
    "batchRef" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "authorityWallet" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txSignature" TEXT,
    "anchorAddress" TEXT,
    "cluster" TEXT NOT NULL DEFAULT 'devnet',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProduceAnchor_pkey" PRIMARY KEY ("produceId")
);

CREATE UNIQUE INDEX "ProduceAnchor_batchRef_key" ON "ProduceAnchor"("batchRef");
CREATE INDEX "ProduceAnchor_status_idx" ON "ProduceAnchor"("status");