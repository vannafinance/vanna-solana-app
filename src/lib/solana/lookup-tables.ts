import type { AddressLookupTableAccount, Connection, PublicKey } from "@solana/web3.js";

// Tables that cannot be read are left out: a transaction built without one is larger, not wrong.
export async function fetchLookupTables(connection: Connection, addresses: readonly PublicKey[]): Promise<AddressLookupTableAccount[]> {
  const found = await Promise.all(addresses.map(async (address) => (await connection.getAddressLookupTable(address)).value));
  return found.filter((table): table is AddressLookupTableAccount => table !== null);
}
