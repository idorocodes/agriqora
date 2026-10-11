import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  TransactionInstruction,
  VersionedTransaction,
  type Connection,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

export interface PreparedAnchor {
  batchRef: string;
  commitment: string;
  anchorAddress: string;
  authorityWallet: string;
  status: string;
  cluster: string;
  txSignature: string | null;
}

const encoder = new TextEncoder();

function bytesFromHex(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error('The server returned an invalid commitment.');
  return Uint8Array.from(value.match(/.{2}/g)!, (byte) => Number.parseInt(byte, 16));
}

async function instructionDiscriminator(name: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`global:${name}`));
  return new Uint8Array(digest).slice(0, 8);
}

export function solanaProgramId(): PublicKey | null {
  const configured = import.meta.env.VITE_SOLANA_PROGRAM_ID?.trim();
  if (!configured) return null;
  try {
    return new PublicKey(configured);
  } catch {
    return null;
  }
}

export async function anchorProduceBatch(
  connection: Connection,
  sendTransaction: (transaction: VersionedTransaction, connection: Connection) => Promise<string>,
  farmer: PublicKey,
  prepared: PreparedAnchor,
): Promise<{ signature: string; anchorAddress: string }> {
  const programId = solanaProgramId();
  if (!programId) throw new Error('The AgriQora Solana program is not configured for this deployment.');
  if (prepared.authorityWallet !== farmer.toBase58()) {
    throw new Error('Connect the farmer wallet prepared for this batch.');
  }

  const batchRef = bytesFromHex(prepared.batchRef);
  const commitment = bytesFromHex(prepared.commitment);
  const [batch] = PublicKey.findProgramAddressSync([encoder.encode('batch'), batchRef], programId);
  const revisionSeed = new Uint8Array(8);
  const [revision] = PublicKey.findProgramAddressSync(
    [encoder.encode('revision'), batchRef, revisionSeed],
    programId,
  );
  if (batch.toBase58() !== prepared.anchorAddress) {
    throw new Error('The prepared batch account does not match the configured program.');
  }

  const discriminator = await instructionDiscriminator('register_batch');
  const data = new Uint8Array(72);
  data.set(discriminator, 0);
  data.set(batchRef, 8);
  data.set(commitment, 40);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: batch, isSigner: false, isWritable: true },
      { pubkey: revision, isSigner: false, isWritable: true },
      { pubkey: farmer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  const lifetime = await connection.getLatestBlockhash('confirmed');
  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: farmer,
      recentBlockhash: lifetime.blockhash,
      instructions: [instruction],
    }).compileToV0Message(),
  );
  const simulation = await connection.simulateTransaction(transaction, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: 'confirmed',
  });
  if (simulation.value.err) {
    const details = simulation.value.logs?.slice(-3).join(' ');
    throw new Error(details || 'Solana rejected the simulated batch registration.');
  }

  const signature = await sendTransaction(transaction, connection);
  const confirmation = await connection.confirmTransaction(
    { signature, ...lifetime },
    'confirmed',
  );
  if (confirmation.value.err) throw new Error('The Solana transaction failed to confirm.');
  return { signature, anchorAddress: batch.toBase58() };
}