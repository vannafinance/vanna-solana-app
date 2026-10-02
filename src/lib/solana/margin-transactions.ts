import type { Connection, PublicKey } from "@solana/web3.js";

import { marginAddress } from "./program-accounts";
import { type SigningHooks, sendInstructions } from "./send-transaction";
import { createMarginInstruction } from "./vanna-instructions";

// Returns null when the account already exists: there is nothing to sign and the caller can treat it as done.
export async function createMarginAccount(connection: Connection, owner: PublicKey, hooks: SigningHooks): Promise<string | null> {
  if ((await connection.getAccountInfo(marginAddress(owner), "confirmed")) !== null) return null;
  return sendInstructions(connection, owner, [createMarginInstruction(owner)], hooks);
}
