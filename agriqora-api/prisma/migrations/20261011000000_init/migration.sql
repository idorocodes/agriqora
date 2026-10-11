CREATE TABLE "User" (
  "id" TEXT NOT NULL, "phone" TEXT NOT NULL, "role" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false, "data" JSONB NOT NULL,
  "passwordHash" TEXT, "authVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_role_verified_idx" ON "User"("role", "verified");
CREATE TABLE "Produce" (
  "id" TEXT NOT NULL, "batchId" TEXT NOT NULL, "category" TEXT NOT NULL,
  "status" TEXT NOT NULL, "title" TEXT NOT NULL, "location" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL, "data" JSONB NOT NULL,
  CONSTRAINT "Produce_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Produce_batchId_key" ON "Produce"("batchId");
CREATE INDEX "Produce_category_idx" ON "Produce"("category");
CREATE INDEX "Produce_status_idx" ON "Produce"("status");
CREATE INDEX "Produce_category_status_idx" ON "Produce"("category", "status");
CREATE INDEX "Produce_createdAt_idx" ON "Produce"("createdAt");
CREATE INDEX "Produce_location_idx" ON "Produce"("location");
CREATE TABLE "BuyerRequest" (
  "id" TEXT NOT NULL, "produceId" TEXT NOT NULL, "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL, "data" JSONB NOT NULL,
  CONSTRAINT "BuyerRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BuyerRequest_produceId_idx" ON "BuyerRequest"("produceId");
CREATE INDEX "BuyerRequest_status_idx" ON "BuyerRequest"("status");
CREATE TABLE "LedgerBlock" (
  "id" TEXT NOT NULL, "blockNumber" INTEGER NOT NULL, "batchId" TEXT NOT NULL,
  "hash" TEXT NOT NULL, "previousHash" TEXT, "kind" TEXT NOT NULL,
  "originalBatchId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data" JSONB NOT NULL, CONSTRAINT "LedgerBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LedgerBlock_blockNumber_key" ON "LedgerBlock"("blockNumber");
CREATE UNIQUE INDEX "LedgerBlock_hash_key" ON "LedgerBlock"("hash");
CREATE INDEX "LedgerBlock_batchId_blockNumber_idx" ON "LedgerBlock"("batchId", "blockNumber");
CREATE INDEX "LedgerBlock_kind_blockNumber_idx" ON "LedgerBlock"("kind", "blockNumber");
CREATE TABLE "LedgerState" ("id" INTEGER NOT NULL, "nextBlockNumber" INTEGER NOT NULL, "lastHash" TEXT, CONSTRAINT "LedgerState_pkey" PRIMARY KEY ("id"));
CREATE TABLE "FarmRecord" (
  "id" TEXT NOT NULL, "farmerName" TEXT NOT NULL, "batchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "data" JSONB NOT NULL,
  CONSTRAINT "FarmRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FarmRecord_farmerName_idx" ON "FarmRecord"("farmerName");
CREATE INDEX "FarmRecord_batchId_idx" ON "FarmRecord"("batchId");
CREATE TABLE "CommunityPost" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data" JSONB NOT NULL, CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL, "userRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "data" JSONB NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userRole_createdAt_idx" ON "Notification"("userRole", "createdAt");
CREATE TABLE "LearningModule" (
  "id" TEXT NOT NULL, "crop" TEXT NOT NULL, "data" JSONB NOT NULL,
  CONSTRAINT "LearningModule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LearningModule_crop_idx" ON "LearningModule"("crop");

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL, "phone" TEXT NOT NULL, "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OtpChallenge_phone_expiresAt_idx" ON "OtpChallenge"("phone", "expiresAt");
CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "refreshTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");
