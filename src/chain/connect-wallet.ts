import { connectSolanaWallet } from "@/chain/external";
import { addExternalWallet, type WalletEntry } from "@/state/wallets";
import { haptic } from "@/ui/haptics";
import { toast } from "@/ui/overlay";

// One tap: Android's own wallet chooser opens (Mobile Wallet Adapter), the person picks a wallet installed on the phone, and it joins the
// list as the wallet in use. Returns it, or null when the person backed out or the wallet didn't answer (the reason is shown as a toast).
let busy = false;
export async function connectAndAddWallet(): Promise<WalletEntry | null> {
  if (busy) return null;
  busy = true;
  haptic.tap();
  try {
    const r = await connectSolanaWallet();
    const w = addExternalWallet("solana", r.app, r.logo, r.address, r.session, r.baseUri);
    haptic.success();
    return w;
  } catch (e) {
    haptic.error();
    toast((e as Error).message || "Couldn't connect your wallet", "err");
    return null;
  } finally {
    busy = false;
  }
}
