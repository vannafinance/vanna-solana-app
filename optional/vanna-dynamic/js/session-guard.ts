import { useEffect } from "react";

import * as dynamic from "@/chain/dynamic";
import { hasEmbeddedWallet, signOut } from "@/state/wallets";
import { toast } from "@/ui/overlay";

// The app remembers who signed in; Dynamic keeps its own session. If Dynamic has lost it, wallets cannot sign, so rather than
// show a signed-in app that fails on every transaction, the person goes back to sign-in.
export function endExpiredSession() {
  signOut();
  toast("Your session ended. Sign in again");
}

// Checked once after launch. Dynamic's page can take a minute to bring the wallets back, so it is given that long.
export function useSessionGuard(ready: boolean) {
  useEffect(() => {
    if (!ready || !dynamic.available || !hasEmbeddedWallet()) return;
    let alive = true;
    (async () => {
      for (let i = 0; i < 30 && alive; i++) {
        const s = await dynamic.getSession().catch(() => null);
        if (s && (s.stellarAddress || s.solanaAddress)) return;
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (alive && hasEmbeddedWallet()) endExpiredSession();
    })();
    return () => {
      alive = false;
    };
  }, [ready]);
}
