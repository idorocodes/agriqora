import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
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
const INITIALIZE_CONFIG_DISCRIMINATOR = createHash("sha256")
  .update("global:initialize_config")
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

function serverAuthority(): Keypair {
  const raw = process.env.SOLANA_AUTHORITY_KEYPAIR?.trim();
  try {
    const keypairPath = process.env.SOLANA_AUTHORITY_KEYPAIR_PATH?.trim();
    const secret = keypairPath
      ? JSON.parse(readFileSync(resolve(keypairPath), "utf8"))
      : raw ? JSON.parse(raw) : null;
    if (!secret) throw new Error("No server authority configured");
    if (!Array.isArray(secret) || secret.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
      throw new Error("Invalid keypair bytes");
    }
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch {
    throw Object.assign(new Error("Configure SOLANA_AUTHORITY_KEYPAIR_PATH or SOLANA_AUTHORITY_KEYPAIR in the API environment"), { status: 503 });
  }
}

function deriveConfigAddress(id: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], id)[0];
}

async function ensureRegistryConfig(rpc: Connection, id: PublicKey, authority: Keypair): Promise<void> {
  const configAddress = deriveConfigAddress(id);
  if (await rpc.getAccountInfo(configAddress, "confirmed")) return;
  const instruction = new TransactionInstruction({
    programId: id,
    keys: [
      { pubkey: configAddress, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INITIALIZE_CONFIG_DISCRIMINATOR,
  });
  try {
    await sendAndConfirmTransaction(rpc, new Transaction().add(instruction), [authority], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  } catch (error) {
    if (!(await rpc.getAccountInfo(configAddress, "confirmed"))) throw error;
  }
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

export async function prepareProduceAnchor(produceId: string) {
  const authority = serverAuthority();
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
    if (existing.status === "confirmed") {
      const verification = await verifyProduceAnchor(produceId);
      if (!verification.verified) throw Object.assign(new Error("The saved Solana anchor no longer matches this produce record"), { status: 409 });
      return { ...publicAnchor(existing), verified: true, programId: programId().toBase58() };
    }
    if (existing.status === "pending" && existing.anchorAddress !== anchorAddress) {
      const refreshed = await prisma.produceAnchor.update({
        where: { produceId },
        data: { anchorAddress, cluster: CLUSTER },
      });
      return {
        batchRef: refreshed.batchRef,
        commitment: refreshed.commitment,
        anchorAddress,
        authorityWallet: authority.publicKey.toBase58(),
        status: refreshed.status,
        cluster: refreshed.cluster,
        txSignature: refreshed.txSignature,
        programId: programId().toBase58(),
      };
    }
    const updated = existing.authorityWallet === authority.publicKey.toBase58()
      ? existing
      : await prisma.produceAnchor.update({ where: { produceId }, data: { authorityWallet: authority.publicKey.toBase58(), anchorAddress, cluster: CLUSTER } });
    return { ...publicAnchor(updated), programId: programId().toBase58() };
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
      authorityWallet: authority.publicKey.toBase58(),
      anchorAddress,
      cluster: CLUSTER,
      status: "pending",
    },
  });
  return { ...publicAnchor(saved), programId: programId().toBase58() };
}

export async function submitProduceAnchor(produceId: string) {
  const authority = serverAuthority();
  const prepared = await prepareProduceAnchor(produceId);
  if (prepared.status === "confirmed") return prepared;
  const anchorRecord = await prisma.produceAnchor.findUnique({ where: { produceId } });
  if (!anchorRecord) throw Object.assign(new Error("Anchor preparation disappeared before submission"), { status: 409 });
  const id = programId();
  const rpc = connection();
  const claimed = await prisma.produceAnchor.updateMany({
    where: { produceId, status: "pending" },
    data: { status: "submitting" },
  });
  if (claimed.count !== 1) {
    const current = await prisma.produceAnchor.findUniqueOrThrow({ where: { produceId } });
    if (current.status === "confirmed") return { ...publicAnchor(current), verified: true, programId: id.toBase58() };
    throw Object.assign(new Error("This batch anchor is already being submitted. Refresh the listing shortly."), { status: 409 });
  }

  try {
    await ensureRegistryConfig(rpc, id, authority);
  const batchRef = Buffer.from(anchorRecord.batchRef, "hex");
  const commitment = Buffer.from(anchorRecord.commitment, "hex");
  const batchAddress = deriveBatchAnchorAddress(anchorRecord.batchRef);
  const currentProduce = await prisma.produce.findUnique({ where: { id: produceId } });
  const expectedSnapshot = currentProduce
    ? makeProduceSnapshot(currentProduce.data as Record<string, any>)
    : null;
  if (!expectedSnapshot) throw Object.assign(new Error("Produce listing not found"), { status: 404 });
  const existingAccount = await rpc.getAccountInfo(batchAddress, "confirmed");
  if (existingAccount) {
    const accountData = existingAccount.data;
    const calculated = deriveRecordCommitment(expectedSnapshot, anchorRecord.batchRef, anchorRecord.salt);
    if (
      !existingAccount.owner.equals(id) ||
      accountData.length < 112 ||
      !accountData.subarray(0, 8).equals(BATCH_ACCOUNT_DISCRIMINATOR) ||
      !accountData.subarray(8, 40).equals(batchRef) ||
      !accountData.subarray(40, 72).equals(authority.publicKey.toBuffer()) ||
      !accountData.subarray(80, 112).equals(commitment) ||
      !calculated.equals(commitment)
    ) {
      throw Object.assign(new Error("An on-chain account already exists for this batch but does not match the saved record"), { status: 409 });
    }
    const [priorSignature] = await rpc.getSignaturesForAddress(batchAddress, { limit: 1 }, "confirmed");
    const updated = await prisma.produceAnchor.update({
      where: { produceId },
      data: { status: "confirmed", txSignature: priorSignature?.signature ?? null, anchorAddress: batchAddress.toBase58() },
    });
    return { ...publicAnchor(updated), verified: true, programId: id.toBase58() };
  }
  const revisionAddress = PublicKey.findProgramAddressSync(
    [Buffer.from("revision"), batchRef, Buffer.alloc(8)], id,
  )[0];
  const instruction = new TransactionInstruction({
    programId: id,
    keys: [
      { pubkey: deriveConfigAddress(id), isSigner: false, isWritable: false },
      { pubkey: batchAddress, isSigner: false, isWritable: true },
      { pubkey: revisionAddress, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([REGISTER_BATCH_DISCRIMINATOR, batchRef, commitment]),
  });
  const blockhash = await rpc.getLatestBlockhash("confirmed");
  const versioned = new VersionedTransaction(new TransactionMessage({
    payerKey: authority.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: [instruction],
  }).compileToV0Message());
  const simulation = await rpc.simulateTransaction(versioned, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
  });
  if (simulation.value.err) {
    const details = simulation.value.logs?.slice(-3).join(" ");
    throw Object.assign(new Error(details || "Solana rejected the batch registration simulation"), { status: 409 });
  }
  const transaction = new Transaction({
    feePayer: authority.publicKey,
    recentBlockhash: blockhash.blockhash,
  }).add(instruction);
  const signature = await sendAndConfirmTransaction(rpc, transaction, [authority], {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const account = await rpc.getAccountInfo(batchAddress, "confirmed");
  if (!account || !account.owner.equals(id) || account.data.length < 112 ||
      !account.data.subarray(0, 8).equals(BATCH_ACCOUNT_DISCRIMINATOR) ||
      !account.data.subarray(8, 40).equals(batchRef) ||
      !account.data.subarray(40, 72).equals(authority.publicKey.toBuffer()) ||
      !account.data.subarray(80, 112).equals(commitment)) {
    throw Object.assign(new Error("Confirmed transaction did not create the expected AgriQora batch account"), { status: 409 });
  }
    const updated = await prisma.produceAnchor.update({
    where: { produceId },
    data: { status: "confirmed", txSignature: signature, anchorAddress: batchAddress.toBase58() },
  });
  return { ...publicAnchor(updated), verified: true, programId: id.toBase58() };
  } catch (error) {
    await prisma.produceAnchor.updateMany({
      where: { produceId, status: "submitting" },
      data: { status: "pending" },
    });
    throw error;
  }
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