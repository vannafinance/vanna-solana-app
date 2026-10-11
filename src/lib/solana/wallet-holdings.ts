import { type Connection, PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assetByMint, NATIVE_SOL_MINT } from "./assets";
import { ApiError } from "./request-json";

export type Holding = { symbol: AssetSymbol; raw: bigint; decimals: number };

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function tokenInfo(data: unknown): { mint: string; amount: bigint } | null {
  if (!isRecord(data) || !isRecord(data.parsed) || !isRecord(data.parsed.info)) return null;
  const { mint, tokenAmount } = data.parsed.info;
  if (typeof mint !== "string" || !isRecord(tokenAmount) || typeof tokenAmount.amount !== "string") return null;
  return { mint, amount: BigInt(tokenAmount.amount) };
}

// A failed read must fail the whole call: an empty list would show a funded wallet as empty.
export async function fetchHoldings(connection: Connection, owner: string): Promise<Holding[]> {
  const ownerKey = new PublicKey(owner);
  const [lamports, spl, spl2022] = await Promise.all([
    connection.getBalance(ownerKey),
    connection.getParsedTokenAccountsByOwner(ownerKey, { programId: TOKEN_PROGRAM }),
    connection.getParsedTokenAccountsByOwner(ownerKey, { programId: TOKEN_2022_PROGRAM }),
  ]).catch(() => {
    throw new ApiError("network");
  });

  const totals = new Map<string, bigint>([[NATIVE_SOL_MINT, BigInt(lamports)]]);
  for (const { account } of [...spl.value, ...spl2022.value]) {
    const info = tokenInfo(account.data);
    if (info) totals.set(info.mint, (totals.get(info.mint) ?? 0n) + info.amount);
  }

  return [...totals].flatMap(([mint, raw]) => {
    const asset = assetByMint.get(mint);
    return asset && raw > 0n ? [{ symbol: asset.symbol, raw, decimals: asset.decimals }] : [];
  });
}
