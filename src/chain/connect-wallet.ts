import { connectSolanaWallet, installedKnownWallets } from "@/chain/external";
import { addExternalWallet, updateWalletIdentity, type WalletEntry } from "@/state/wallets";
import { haptic } from "@/ui/haptics";
import { toast } from "@/ui/overlay";
import { pickWallet } from "@/ui/pick-wallet";

// One tap: Android's own wallet chooser opens (Mobile Wallet Adapter), the person picks a wallet installed on the phone, and it joins the
// list as the wallet in use. Returns it, or null when the person backed out or the wallet didn't answer (the reason is shown as a toast).
let busy = false;
export async function connectAndAddWallet(): Promise<WalletEntry | null> {
  if (busy) return null;
  busy = true;
  haptic.tap();
  try {
    const r = await connectSolanaWallet();
    let w = addExternalWallet("solana", r.app, r.logo, r.address, r.session, r.baseUri, r.icon);
    // A wallet that sends neither a link nor an icon (Backpack) can't be told apart from the others installed on the phone. Ask once,
    // so its package is remembered and Android's chooser doesn't open again on every transaction.
    if (r.app === "Wallet") {
      const installed = await installedKnownWallets();
      if (installed.length > 1) {
        const pick = await pickWallet(installed);
        if (pick) {
          updateWalletIdentity("solana", w.id, { app: pick.app, logo: pick.logo, icon: r.icon });
          w = { ...w, app: pick.app, logo: pick.logo };
        }
      }
    }
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
