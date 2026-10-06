// Builds sample wallet transactions whose logs carry real Vanna program events ("Program data: <base64>"), so the
// app's own event decoders (margin history, trader history, ...) read them exactly like on-chain data.

import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

const VANNA_PROGRAM_ID = "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg";

// Anchor event discriminators.
const DISCRIMINATOR = {
  swapped: [25, 110, 111, 203, 233, 54, 199, 222],
  borrowed: [225, 182, 241, 78, 34, 145, 253, 230],
  deposited: [244, 62, 77, 11, 135, 112, 61, 96],
  withdrawn: [51, 224, 133, 106, 74, 173, 72, 82],
  repaid: [145, 11, 56, 225, 154, 212, 54, 105],
  liteOpened: [183, 79, 102, 12, 14, 22, 68, 6],
  liteClosed: [223, 92, 122, 13, 82, 201, 161, 171],
};

/** Serialises event fields (byte arrays, public keys, base58 strings, u64 bigints) into a "Program data:" log line. */
function programData(parts) {
  const chunks = parts.map((part) => {
    if (Array.isArray(part)) return Uint8Array.from(part);
    if (part instanceof PublicKey) return part.toBytes();
    if (typeof part === "string") return new PublicKey(part).toBytes();
    if (typeof part === "bigint") {
      const bytes = new Uint8Array(8);
      new DataView(bytes.buffer).setBigUint64(0, part, true);
      return bytes;
    }
    throw new Error("bad event part");
  });
  const data = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return "Program data: " + Buffer.from(data).toString("base64");
}

/** Log lines for each event kind; `margin` is the margin account, mints / reserves / strategies are base58. */
export const ev = {
  swapped: (margin, mintIn, mintOut, amountIn, amountOut) =>
    programData([DISCRIMINATOR.swapped, margin, mintIn, mintOut, amountIn, amountOut, amountOut]),
  borrowed: (margin, reserve, amount) => programData([DISCRIMINATOR.borrowed, margin, reserve, amount]),
  deposited: (margin, mint, amount) => programData([DISCRIMINATOR.deposited, margin, mint, amount]),
  withdrawn: (margin, mint, amount) => programData([DISCRIMINATOR.withdrawn, margin, mint, amount]),
  repaid: (margin, reserve, amount) => programData([DISCRIMINATOR.repaid, margin, reserve, margin, amount]),
  liteOpened: (margin, strategy, amount) => programData([DISCRIMINATOR.liteOpened, margin, strategy, amount]),
  liteClosed: (margin, strategy, amount, profit) =>
    programData([DISCRIMINATOR.liteClosed, margin, strategy, 0n, amount, profit]),
};

/** A confirmed transaction (as returned by getParsedTransaction) that only carries the given log lines. */
export function transaction(signature, blockTime, logs) {
  return {
    signature,
    blockTime,
    tx: {
      slot: 380000000 + (blockTime % 100000),
      blockTime,
      meta: {
        err: null,
        fee: 5000,
        logMessages: [`Program ${VANNA_PROGRAM_ID} invoke [1]`, ...logs, `Program ${VANNA_PROGRAM_ID} success`],
        preBalances: [],
        postBalances: [],
        innerInstructions: [],
        preTokenBalances: [],
        postTokenBalances: [],
      },
      transaction: {
        signatures: [signature],
        message: { accountKeys: [], instructions: [], recentBlockhash: "11111111111111111111111111111111" },
      },
      version: 0,
    },
  };
}
