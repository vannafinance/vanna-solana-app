import type { WalletEntry } from "@/state/wallets";
import { openConnectSheet } from "@/ui/connect-sheet";
import { haptic } from "@/ui/haptics";

// Connect wallet (intro) and Add wallet (Account): the Connect a wallet sheet (ui/connect-sheet.tsx) runs the whole connection, from
// the wallet apps found on the phone to the Connected animation, and asks which wallet to replace when 2 are kept. Returns the new
// wallet (now the one in use), or null when the person backed out or it didn't connect (the sheet showed why).
// A double tap must not open a second sheet. A sheet lost without closing must not leave the button dead until the app is restarted:
// after CONNECT_MS (the sheet's own wallet wait) plus a margin the next tap opens a new one.
const CONNECT_MS = 90_000;
let busy = false;
let busyAt = 0;
let run = 0;
export async function connectAndAddWallet(opts: { replacingId?: string } = {}): Promise<WalletEntry | null> {
  if (busy && Date.now() - busyAt < CONNECT_MS + 5_000) return null;
  const mine = ++run;
  busy = true;
  busyAt = Date.now();
  haptic.tap();
  try {
    return await openConnectSheet(opts);
  } finally {
    if (run === mine) busy = false;
  }
}
