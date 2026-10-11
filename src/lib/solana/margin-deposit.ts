import { type Connection, PublicKey } from "@solana/web3.js";

import { depositCollateralInstruction } from "./margin-instructions";
import { usdcAsset } from "./perps-transactions";
import { associatedTokenAddress, tokenProgramOf } from "./program-accounts";
import { type SigningHooks, sendInstructions } from "./send-transaction";
import { createAssociatedTokenAccountIdempotent } from "./token-instructions";

// Deposit USDC from the wallet into the margin account. Collateral is shared across the whole account, so this lifts the
// health of every position rather than one of them, as on the web app.
export function depositUsdcCollateral(connection: Connection, owner: PublicKey, amount: bigint, hooks: SigningHooks): Promise<string> {
  if (amount <= 0n) throw new RangeError("Enter a deposit amount");
  const usdc = usdcAsset();
  const mint = new PublicKey(usdc.mint);
  const source = associatedTokenAddress(owner, mint, tokenProgramOf(usdc));
  return sendInstructions(
    connection,
    owner,
    [createAssociatedTokenAccountIdempotent(owner, source, owner, mint, tokenProgramOf(usdc)), depositCollateralInstruction({ authority: owner, asset: usdc, amount, source })],
    hooks,
  );
}
