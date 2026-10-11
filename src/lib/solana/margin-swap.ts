import { type AddressLookupTableAccount, ComputeBudgetProgram, type Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";

import { type AssetSymbol, assetByMint } from "./assets";
import { API_BASE_URL } from "./config";
import { JUPITER_PROGRAM, marginSwapInstruction } from "./margin-instructions";
import { type MarginState, positionAccounts } from "./margin-state";
import { UnsupportedRouteError } from "./perps-errors";
import { ASSOCIATED_TOKEN_PROGRAM, associatedTokenAddress, marginAddress, swapAuthorityAddress, tokenProgramOf } from "./program-accounts";
import { ApiError, requestJson } from "./request-json";

export const MARGIN_SWAP_COMPUTE_UNITS = 1_400_000;
const CREATE_IDEMPOTENT = 1;

type ApiInstruction = { programId: string; accounts: { pubkey: string; isWritable: boolean; isSigner: boolean }[]; data: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiInstruction(value: unknown): value is ApiInstruction {
  return (
    isRecord(value) &&
    typeof value.programId === "string" &&
    typeof value.data === "string" &&
    Array.isArray(value.accounts) &&
    value.accounts.every((account) => isRecord(account) && typeof account.pubkey === "string" && typeof account.isWritable === "boolean" && typeof account.isSigner === "boolean")
  );
}

function decode(instruction: ApiInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((account) => ({ pubkey: new PublicKey(account.pubkey), isSigner: account.isSigner, isWritable: account.isWritable })),
    data: Buffer.from(instruction.data, "base64"),
  });
}

type QuoteFields = { inputMint: string; outputMint: string; inAmount: bigint; threshold: bigint; exactIn: boolean };

function readQuote(quote: unknown): QuoteFields {
  if (!isRecord(quote) || typeof quote.inputMint !== "string" || typeof quote.outputMint !== "string") throw new ApiError("invalid-response");
  if (typeof quote.inAmount !== "string" || typeof quote.otherAmountThreshold !== "string") throw new ApiError("invalid-response");
  return { inputMint: quote.inputMint, outputMint: quote.outputMint, inAmount: BigInt(quote.inAmount), threshold: BigInt(quote.otherAmountThreshold), exactIn: quote.swapMode !== "ExactOut" };
}

export type MarginSwapBuild = { instructions: TransactionInstruction[]; tables: AddressLookupTableAccount[] };

type MarginSwapOptions = {
  quote: unknown;
  owner: PublicKey;
  state: MarginState;
  injectDebt?: AssetSymbol;
  grossAmountIn?: bigint;
};

// Builds the program's swap instruction around a Jupiter route. The route is fetched as plain instructions whose
// authority is the program's swap authority, and anything beyond ATA setup and the swap itself is refused: the route
// service is not trusted to add transfers, approvals or cleanup.
export async function buildMarginSwap(connection: Connection, { quote, owner, state, injectDebt, grossAmountIn }: MarginSwapOptions): Promise<MarginSwapBuild> {
  const fields = readQuote(quote);
  const input = assetByMint.get(fields.inputMint);
  const output = assetByMint.get(fields.outputMint);
  if (!input || !output || input.symbol === output.symbol || !fields.exactIn) throw new UnsupportedRouteError("Select two supported assets for an exact-input margin swap");
  if (fields.threshold <= 0n) throw new UnsupportedRouteError("The route has no minimum output protection");

  const margin = marginAddress(owner);
  const swapAuthority = swapAuthorityAddress(margin);
  const outputEscrow = associatedTokenAddress(swapAuthority, new PublicKey(output.mint), tokenProgramOf(output));

  const [built, remaining] = await Promise.all([
    requestJson(`${API_BASE_URL}/api/jupiter/swap-instructions`, {
      body: { quoteResponse: quote, userPublicKey: swapAuthority.toBase58(), payer: owner.toBase58(), destinationTokenAccount: outputEscrow.toBase58() },
    }),
    positionAccounts(connection, state, { excludeCollateral: [input.symbol], injectDebt }),
  ]);

  if (!isRecord(built) || !isApiInstruction(built.swapInstruction)) throw new ApiError("invalid-response");
  if (built.tokenLedgerInstruction || built.cleanupInstruction || (Array.isArray(built.otherInstructions) && built.otherInstructions.length > 0)) {
    throw new UnsupportedRouteError("This route needs extra instructions the program does not accept. Request a new quote.");
  }

  const route = decode(built.swapInstruction);
  if (!route.programId.equals(JUPITER_PROGRAM)) throw new UnsupportedRouteError("Unexpected swap program");
  if (route.keys.some((key) => key.isSigner && !key.pubkey.equals(swapAuthority))) throw new UnsupportedRouteError("Unexpected route signer");

  const setupSource: unknown[] = Array.isArray(built.setupInstructions) ? built.setupInstructions : [];
  const setup = setupSource.map((item) => {
    if (!isApiInstruction(item)) throw new ApiError("invalid-response");
    return decode(item);
  });
  for (const instruction of setup) {
    const createsAssociatedAccount = instruction.programId.equals(ASSOCIATED_TOKEN_PROGRAM) && (instruction.data.length === 0 || (instruction.data.length === 1 && instruction.data[0] === CREATE_IDEMPOTENT));
    if (!createsAssociatedAccount || !instruction.keys[0]?.pubkey.equals(owner) || !instruction.keys[2]?.pubkey.equals(swapAuthority)) {
      throw new UnsupportedRouteError("Unexpected margin swap setup instruction");
    }
  }

  // Jupiter always adds the step that creates the swap's token accounts. One that already exists (any earlier swap into the
  // same asset made it) is left out: that step and the program it calls cost about 40 bytes, enough to push a swap on an
  // account holding many positions over the size limit and onto a lookup table that Solflare refuses.
  const created = setup.length > 0 ? await connection.getMultipleAccountsInfo(setup.map((instruction) => instruction.keys[1].pubkey), "confirmed") : [];
  const neededSetup = setup.filter((_, index) => created[index] === null);

  const swap = marginSwapInstruction({
    authority: owner,
    input,
    output,
    amountIn: grossAmountIn ?? fields.inAmount,
    minAmountOut: fields.threshold,
    route: { accounts: route.keys, data: route.data },
    remaining,
  });

  const tableAddresses: unknown[] = Array.isArray(built.addressLookupTableAddresses) ? built.addressLookupTableAddresses : [];
  const tables = await Promise.all(
    tableAddresses.map(async (address) => {
      if (typeof address !== "string") throw new ApiError("invalid-response");
      return (await connection.getAddressLookupTable(new PublicKey(address))).value;
    }),
  );

  return {
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: MARGIN_SWAP_COMPUTE_UNITS }), ...neededSetup, swap],
    tables: tables.filter((table): table is AddressLookupTableAccount => table !== null),
  };
}
