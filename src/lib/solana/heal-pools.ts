import { type AddressLookupTableAccount, type Connection, PublicKey, type VersionedTransaction } from "@solana/web3.js";

import { FORK_CHEATCODES_ENABLED, RPC_URL } from "./config";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./program-accounts";

// Concentrated liquidity pools are cloned from mainnet once and then frozen on the fork, so they drift from the live
// state Jupiter quotes against and the swap fails with its slippage error or a missing bin array.
const STALE_PRONE_DEX_PROGRAMS = new Set([
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLMM
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", // Meteora DLMM
]);

const ACCOUNTS_PER_READ = 100;
const AUTHORITY_START = 32;
const AUTHORITY_END = 64;

async function readAccounts(connection: Connection, keys: readonly PublicKey[]) {
  const infos = [];
  for (let start = 0; start < keys.length; start += ACCOUNTS_PER_READ) {
    infos.push(...(await connection.getMultipleAccountsInfo(keys.slice(start, start + ACCOUNTS_PER_READ), "confirmed")));
  }
  return infos;
}

async function resetAccount(address: string): Promise<void> {
  await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "surfnet_resetAccount", params: [address] }),
  });
}

// Re-clones, from live mainnet, every concentrated liquidity pool this transaction touches, the token accounts that hold
// that pool's reserves (their authority is the pool itself), and any address lookup table the fork holds in a shorter
// form than the transaction needs. The same already-built transaction is then valid again, without a new quote.
// Fork only: a real cluster has no such method. Returns how many accounts were reset, so callers retry only when
// something was fixed and never mask an unrelated failure.
export async function healStaleDexPools(connection: Connection, transaction: VersionedTransaction): Promise<number> {
  if (!FORK_CHEATCODES_ENABLED) return 0;
  const message = transaction.message;
  const keys = [...message.staticAccountKeys];
  const staleTables: string[] = [];

  for (const lookup of message.addressTableLookups) {
    const table: AddressLookupTableAccount | null = (await connection.getAddressLookupTable(lookup.accountKey)).value;
    const highest = Math.max(-1, ...lookup.writableIndexes, ...lookup.readonlyIndexes);
    if (table === null || table.state.addresses.length <= highest) {
      staleTables.push(lookup.accountKey.toBase58());
      continue;
    }
    for (const index of [...lookup.writableIndexes, ...lookup.readonlyIndexes]) keys.push(table.state.addresses[index]);
  }

  const infos = await readAccounts(connection, keys);
  const pools = new Set(keys.filter((_, index) => STALE_PRONE_DEX_PROGRAMS.has(infos[index]?.owner.toBase58() ?? "")).map((key) => key.toBase58()));
  const reserves = keys.filter((_, index) => {
    const info = infos[index];
    if (!info || info.data.length < AUTHORITY_END) return false;
    if (!info.owner.equals(TOKEN_PROGRAM) && !info.owner.equals(TOKEN_2022_PROGRAM)) return false;
    return pools.has(new PublicKey(info.data.subarray(AUTHORITY_START, AUTHORITY_END)).toBase58());
  });

  const stale = [...new Set([...pools, ...reserves.map((key) => key.toBase58()), ...staleTables])];
  await Promise.all(stale.map(resetAccount));
  return stale.length;
}
