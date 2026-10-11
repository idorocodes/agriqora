import crypto from "crypto";

/** Generates a realistic-looking SHA-256 "block hash" for the simulated ledger. */
export function generateBlockchainHash(payload: string): string {
  return (
    "0x" +
    crypto
      .createHash("sha256")
      .update(payload + Date.now().toString() + crypto.randomBytes(8).toString("hex"))
      .digest("hex")
  );
}

/** Collision-safe id generator (Date.now() alone can collide within the same ms). */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}
