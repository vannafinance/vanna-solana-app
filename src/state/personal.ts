import { useSyncExternalStore } from "react";

import type { Chain } from "@/state/chain";
import { inUseWallet, onWalletsChanged, walletState } from "@/state/wallets";

// Personal figures (balances, deposits, health) stay a dash until the wallet in use
// is a real one. Preview sign-in uses a stand-in address, so it stays a dash too.
// Pool rates, prices and the perp chart do not use this.
export function personalReady(chain: Chain) {
  const w = inUseWallet(chain);
  return !!w && w.sample !== true;
}

export function usePersonal(chain: Chain) {
  useSyncExternalStore(onWalletsChanged, walletState, walletState);
  return personalReady(chain);
}
