import { createHash, randomBytes } from "node:crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Prisma } from "@prisma/client";
import { prisma } from "../data/prisma.js";

const DEVNET_RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const CLUSTER = "devnet";
const REGISTER_BATCH_DISCRIMINATOR = createHash("sha256")
  .update("global:register_batch")
  .digest()
  .subarray(0, 8);
const BATCH_ACCOUNT_DISCRIMINATOR = createHash("sha256")
  .update("account:BatchAnchor")
  .digest()
  .subarray(0, 8);

export function anchorStorageNotMigrated(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export interface ProduceRecordSnapshot {
  id: string;
  batchId: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  priceUnit: string;
  location: string;
  farmerName: string;
  farmName: string;
  harvestDate: string;
  farmingMethod: string;
  description: string;
}

function sha256(value: Uint8Array | string): Buffer {
  return createHash("sha256").update(value).digest();
}

function programId(): PublicKey {
  const configured = process.env.SOLANA_PROGRAM_ID?.trim();
  if (!configured) throw Object.assign(new Error("Solana program is not configured"), { status: 503 });
  try {
    return new PublicKey(configured);
  } catch {
    throw Object.assign(new Error("SOLANA_PROGRAM_ID is invalid"), { status: 503 });
  }
}

function connection(): Connection {
  return new Connection(DEVNET_RPC, { commitment: "confirmed" });
}

export function makeProduceSnapshot(produce: Record<string, any>): ProduceRecordSnapshot {
  return {
    id: String(produce.id),
    batchId: String(produce.batchId),
    title: String(produce.title),
    category: String(produce.category),
    quantity: Number(produce.quantity),
    unit: String(produce.unit),
    price: Number(produce.price),
    priceUnit: String(produce.priceUnit),
    location: String(produce.location),
    farmerName: String(produce.farmerName),
    farmName: String(produce.farmName),
    harvestDate: String(produce.harvestDate),
    farmingMethod: String(produce.farmingMethod),
    description: String(produce.description),
  };
}

export function deriveBatchReference(batchId: string): Buffer {
  return sha256(`agriqora:batch:v1:${batchId}`);
}

export function deriveRecordCommitment(
  snapshot: ProduceRecordSnapshot,
  batchRefHex: string,
  saltHex: string,
): Buffer {
  return sha256(
    Buffer.concat([
      Buffer.from("AGRIQORA_RECORD_COMMITMENT_V1\0", "utf8"),
      Buffer.from(batchRefHex, "hex"),
      Buffer.from(JSON.stringify(snapshot), "utf8"),
      Buffer.from(saltHex, "hex"),
    ]),
  );
}

export function deriveBatchAnchorAddress(batchRefHex: string): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("batch"), Buffer.from(batchRefHex, "hex")],
    programId(),
  );
  return address;
}

export async function prepareProduceAnchor(produceId: string, walletAddress: string) {
  const authority = new PublicKey(walletAddress);
  const produce = await prisma.produce.findUnique({ where: { id: produceId } });
  if (!produce) throw Object.assign(new Error("Produce listing not found"), { status: 404 });

  const batchRef = deriveBatchReference(produce.batchId);
  const batchRefHex = batchRef.toString("hex");
  const anchorAddress = deriveBatchAnchorAddress(batchRefHex).toBase58();
  let existing;
  try {
    existing = await prisma.produceAnchor.findUnique({ where: { produceId } });
  } catch (error) {
    if (anchorStorageNotMigrated(error)) {
      throw Object.assign(new Error("Solana anchoring is not ready: apply the API database migrations first"), { status: 503 });
    }
    throw error;
  }
  if (existing) {
    if (existing.authorityWallet !== authority.toBase58()) {
      throw Object.assign(new Error("This batch is already assigned to another wallet"), { status: 409 });
    }
    return {
      batchRef: existing.batchRef,
      commitment: existing.commitment,
      anchorAddress: existing.anchorAddress ?? anchorAddress,
      authorityWallet: existing.authorityWallet,
      status: existing.status,
      cluster: existing.cluster,
      txSignature: existing.txSignature,
    };
  }

  const snapshot = makeProduceSnapshot(produce.data as Record<string, any>);
  const salt = randomBytes(32).toString("hex");
  const commitment = deriveRecordCommitment(snapshot, batchRefHex, salt).toString("hex");
  const saved = await prisma.produceAnchor.create({
    data: {
      produceId,
      batchRef: batchRefHex,
      commitment,
      salt,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      authorityWallet: authority.toBase58(),
      anchorAddress,
      cluster: CLUSTER,
      status: "pending",
    },
  });
  return {
    batchRef: saved.batchRef,
    commitment: saved.commitment,
    anchorAddress: saved.anchorAddress,
    authorityWallet: saved.authorityWallet,
    status: saved.status,
    cluster: saved.cluster,
    txSignature: saved.txSignature,
  };
}

export async function confirmProduceAnchor(produceId: string, signature: string) {
  const anchor = await prisma.produceAnchor.findUnique({ where: { produceId } });
  if (!anchor) throw Object.assign(new Error("Anchor preparation not found"), { status: 404 });
  const rpc = connection();
  const id = programId();
  const expectedAddress = deriveBatchAnchorAddress(anchor.batchRef);
  if (anchor.anchorAddress !== expectedAddress.toBase58()) {
    throw Object.assign(new Error("Prepared batch address is invalid"), { status: 400 });
  }

  const transaction = await rpc.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!transaction || transaction.meta?.err) {
    throw Object.assign(new Error("Solana transaction is not confirmed successfully"), { status: 409 });
  }
  const authority = new PublicKey(anchor.authorityWallet);
  const instruction = transaction.transaction.message.instructions.find((ix) =>
    ix.programId.equals(id) && "data" in ix && "accounts" in ix,
  );
  if (!instruction || !("data" in instruction) || !("accounts" in instruction)) {
    throw Object.assign(new Error("Transaction does not contain the AgriQora registration instruction"), { status: 400 });
  }
  const instructionData = Buffer.from(bs58.decode(instruction.data));
  const batchRef = Buffer.from(anchor.batchRef, "hex");
  const commitment = Buffer.from(anchor.commitment, "hex");
  const instructionAccounts = instruction.accounts as PublicKey[];
  const authoritySigned = transaction.transaction.message.accountKeys.some(
    (key) => key.pubkey.equals(authority) && key.signer,
  );
  if (
    !authoritySigned ||
    !instructionAccounts.some((key) => key.equals(authority)) ||
    !instructionAccounts.some((key) => key.equals(expectedAddress)) ||
    !instructionData.subarray(0, 8).equals(REGISTER_BATCH_DISCRIMINATOR) ||
    !instructionData.subarray(8, 40).equals(batchRef) ||
    !instructionData.subarray(40, 72).equals(commitment)
  ) {
    throw Object.assign(new Error("Confirmed transaction does not match the prepared batch commitment"), { status: 400 });
  }

  const account = await rpc.getAccountInfo(expectedAddress, "confirmed");
  if (!account || !account.owner.equals(id)) {
    throw Object.assign(new Error("Batch anchor account was not found under the configured program"), { status: 409 });
  }
  const data = account.data;
  const snapshot = anchor.snapshot as unknown as ProduceRecordSnapshot;
  const currentProduce = await prisma.produce.findUnique({ where: { id: produceId } });
  const currentSnapshot = currentProduce
    ? makeProduceSnapshot(currentProduce.data as Record<string, any>)
    : null;
  const calculated = deriveRecordCommitment(snapshot, anchor.batchRef, anchor.salt);
  if (
    data.length < 112 ||
    !data.subarray(0, 8).equals(BATCH_ACCOUNT_DISCRIMINATOR) ||
    !data.subarray(8, 40).equals(batchRef) ||
    !data.subarray(40, 72).equals(authority.toBuffer()) ||
    !data.subarray(80, 112).equals(commitment) ||
    !calculated.equals(commitment) ||
    !currentSnapshot ||
    JSON.stringify(currentSnapshot) !== JSON.stringify(snapshot)
  ) {
    throw Object.assign(new Error("On-chain batch account does not match the off-chain produce record"), { status: 409 });
  }

  const updated = await prisma.produceAnchor.update({
    where: { produceId },
    data: { status: "confirmed", txSignature: signature, anchorAddress: expectedAddress.toBase58() },
  });
  return publicAnchor(updated);
}

export async function verifyProduceAnchor(produceId: string) {
  let anchor;
  try {
    anchor = await prisma.produceAnchor.findUnique({ where: { produceId } });
  } catch (error) {
    if (anchorStorageNotMigrated(error)) return { status: "migration_required", verified: false, cluster: CLUSTER, commitment: null };
    throw error;
  }
  if (!anchor) return { status: "not_anchored", verified: false, cluster: CLUSTER, commitment: null };
  const publicData = publicAnchor(anchor);
  if (anchor.status !== "confirmed") return { ...publicData, verified: false };

  try {
    const id = programId();
    const address = deriveBatchAnchorAddress(anchor.batchRef);
    const account = await connection().getAccountInfo(address, "confirmed");
    const data = account?.data;
    const commitment = Buffer.from(anchor.commitment, "hex");
    const snapshot = anchor.snapshot as unknown as ProduceRecordSnapshot;
    const currentProduce = await prisma.produce.findUnique({ where: { id: produceId } });
    const currentSnapshot = currentProduce
      ? makeProduceSnapshot(currentProduce.data as Record<string, any>)
      : null;
    const calculated = deriveRecordCommitment(snapshot, anchor.batchRef, anchor.salt);
    const verified = Boolean(
      account &&
        account.owner.equals(id) &&
        data !== undefined &&
        data.length >= 112 &&
        data.subarray(0, 8).equals(BATCH_ACCOUNT_DISCRIMINATOR) &&
        data.subarray(8, 40).toString("hex") === anchor.batchRef &&
        data.subarray(40, 72).equals(new PublicKey(anchor.authorityWallet).toBuffer()) &&
        data.subarray(80, 112).equals(commitment) &&
        calculated.equals(commitment) &&
        currentSnapshot !== null &&
        JSON.stringify(currentSnapshot) === JSON.stringify(snapshot),
    );
    return { ...publicData, verified };
  } catch {
    return { ...publicData, verified: false };
  }
}

export function publicAnchor(anchor: {
  batchRef: string;
  commitment: string;
  authorityWallet: string;
  revision: number;
  status: string;
  txSignature: string | null;
  anchorAddress: string | null;
  cluster: string;
}) {
  return {
    batchRef: anchor.batchRef,
    commitment: anchor.commitment,
    authorityWallet: anchor.authorityWallet,
    revision: anchor.revision,
    status: anchor.status,
    txSignature: anchor.txSignature,
    anchorAddress: anchor.anchorAddress,
    cluster: anchor.cluster,
    programId: process.env.SOLANA_PROGRAM_ID ?? null,
  };
}