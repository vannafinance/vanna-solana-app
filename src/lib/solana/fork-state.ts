import { type AccountInfo, type Connection, PublicKey } from "@solana/web3.js";

import { assets } from "./assets";
import { FORK_CHEATCODES_ENABLED, RPC_URL } from "./config";
import { VANNA_LOOKUP_TABLE } from "./kamino";

// The fork's slot and epoch run behind mainnet's, while the accounts it copies carry mainnet's. Two things then differ
// from mainnet, and the wallet and the quotes follow mainnet:
// - Vanna's lookup table: its latest addresses count as added in the fork's future, so a transaction that a wallet
//   (Solflare rewrites what it signs) points at them fails with "invalid index".
// - A Token-2022 transfer fee that changes at an epoch mainnet has reached: the fork still charges the older one (5%
//   instead of 1% on the xStocks), so a swap gets less than its quote and fails the slippage check.
// Before an order both are brought in line with mainnet. The fork copies an account from mainnet again from time to time,
// which undoes this, so it runs before every order; when all is already in line it costs one account read.
const TABLE_LAST_EXTENDED_SLOT_OFFSET = 12;
const TABLE_START_INDEX_OFFSET = 20;

// Token-2022 mint: the base mint padded to the account length, the account type, then type-length-value extensions.
const EXTENSIONS_OFFSET = 166;
const TRANSFER_FEE_CONFIG = 1;
// Two authorities and the withheld amount precede the older fee, then the newer: epoch u64, maximum u64, basis points u16.
const OLDER_FEE_OFFSET = 72;
const FEE_LENGTH = 18;

const token2022Mints = assets.filter((asset) => asset.token2022).map((asset) => new PublicKey(asset.mint));

export function activatedTable(data: Uint8Array, slot: number): Uint8Array | undefined {
  if (data.length < TABLE_START_INDEX_OFFSET + 1) return undefined;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getBigUint64(TABLE_LAST_EXTENDED_SLOT_OFFSET, true) < BigInt(slot)) return undefined;
  const next = Uint8Array.from(data);
  const nextView = new DataView(next.buffer);
  nextView.setBigUint64(TABLE_LAST_EXTENDED_SLOT_OFFSET, 0n, true);
  next[TABLE_START_INDEX_OFFSET] = 0;
  return next;
}

export function currentTransferFee(data: Uint8Array, epoch: number): Uint8Array | undefined {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = EXTENSIONS_OFFSET; offset + 4 <= data.length; ) {
    const type = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    const start = offset + 4;
    if (type === TRANSFER_FEE_CONFIG) {
      const older = start + OLDER_FEE_OFFSET;
      const newer = older + FEE_LENGTH;
      if (newer + FEE_LENGTH > data.length) return undefined;
      const scheduledFor = view.getBigUint64(newer, true);
      const sameFee = data.subarray(older, newer).every((byte, index) => byte === data[newer + index]);
      if (sameFee || scheduledFor <= BigInt(epoch)) return undefined;
      const next = Uint8Array.from(data);
      next.copyWithin(older, newer, newer + FEE_LENGTH);
      return next;
    }
    if (length === 0 && type === 0) return undefined;
    offset = start + length;
  }
  return undefined;
}

async function setAccount(address: PublicKey, account: AccountInfo<Buffer>, data: Uint8Array): Promise<void> {
  await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "surfnet_setAccount",
      params: [address.toBase58(), { lamports: account.lamports, data: Buffer.from(data).toString("hex"), owner: account.owner.toBase58(), executable: account.executable, rentEpoch: 0 }],
    }),
  });
}

// Fork only: a real cluster has no such method, and on mainnet both already hold.
export async function alignForkWithMainnet(connection: Connection): Promise<void> {
  if (!FORK_CHEATCODES_ENABLED) return;
  try {
    const addresses = [VANNA_LOOKUP_TABLE, ...token2022Mints];
    const [accounts, epoch] = await Promise.all([connection.getMultipleAccountsInfo(addresses, "confirmed"), connection.getEpochInfo("confirmed")]);
    await Promise.all(
      accounts.map(async (account, index) => {
        if (!account) return;
        const data = index === 0 ? activatedTable(account.data, epoch.absoluteSlot) : currentTransferFee(account.data, epoch.epoch);
        if (data) await setAccount(addresses[index], account, data);
      }),
    );
  } catch {
    // Left as it is, the order meets the same failure the simulation explains.
  }
}
