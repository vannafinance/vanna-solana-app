// Replaces `fetchVaultAccounts` of src/lib/solana/vault-accounts.ts with sample data; every other export of that module is passed through.
// (overrides.js redirects imports of src/lib/solana/vault-accounts.ts here; this file's own import of it is not redirected.)
export * from "@/lib/solana/vault-accounts";

import { vaultAccounts } from "../sample-data";
import { delay } from "../delay";

export async function fetchVaultAccounts() {
  await delay();
  return vaultAccounts();
}
