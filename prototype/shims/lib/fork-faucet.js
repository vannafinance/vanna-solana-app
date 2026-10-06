// Replaces `requestFaucetGrant` of src/lib/solana/fork-faucet.ts: the test faucet grants tokens locally (they are
// added to the sample wallet's holdings through sample-data `addFaucet`) instead of calling the fork's faucet.
// Every other export of that module is passed through.
export * from "@/lib/solana/fork-faucet";

import { assets } from "@/lib/solana/assets";

import { addFaucet, units } from "../sample-data";
import { delay } from "../delay";

export async function requestFaucetGrant(symbol) {
  await delay(900);
  if (globalThis.__vnProto && globalThis.__vnProto.peek() === "offline") throw new Error("The faucet is not available right now.");
  const added = units(symbol === "SOL" ? "100" : symbol === "USDC" ? "1000" : "20", symbol);
  addFaucet(symbol, added);
  return { symbol, added, decimals: assets.find((asset) => asset.symbol === symbol).decimals };
}
