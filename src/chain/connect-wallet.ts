import { connectSolanaWallet, installedKnownWallets, type InstalledWallet } from "@/chain/external";
import { addExternalWallet, type WalletEntry } from "@/state/wallets";
import { haptic } from "@/ui/haptics";
import { toast } from "@/ui/overlay";
import { pickWallet } from "@/ui/pick-wallet";

// One tap: the wallets installed on the phone are listed (Phantom, Solflare, Backpack, Seed Vault) and the person taps theirs; it opens
// directly through Mobile Wallet Adapter, with no Android chooser, and joins the list as the wallet in use. Only one installed: it
// connects at once, no list. A wallet not in the list is reached by "Other wallet" (Android's own chooser). Returns the wallet, or null
// when the person backed out or the wallet didn't answer (the reason is shown as a toast).
const OTHER = { app: "Other wallet", logo: "VANNA", pkg: "" };
let busy = false;
export async function connectAndAddWallet(): Promise<WalletEntry | null> {
  if (busy) return null;
  busy = true;
  haptic.tap();
  try {
    const installed = await installedKnownWallets();
    let target: InstalledWallet | undefined;
    if (installed.length === 1) target = installed[0];
    else if (installed.length > 1) {
      const pick = await pickWallet([...installed, OTHER]);
      if (!pick) return null;
      target = pick.pkg ? pick : undefined;
    }
    const r = await connectSolanaWallet(target);
    const w = addExternalWallet("solana", r.app, r.logo, r.address, r.session, r.baseUri, r.icon);
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
