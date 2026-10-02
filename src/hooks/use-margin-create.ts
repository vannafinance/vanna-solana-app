import { router } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

import { shortAddress } from "@/format/short-address";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { useTransactionFlow } from "@/hooks/use-transaction-flow";
import { useWalletSigner } from "@/hooks/use-wallet-signer";
import { createMarginAccount } from "@/lib/solana/margin-transactions";
import { marginAddress } from "@/lib/solana/program-accounts";
import type { EnvelopeStage, MarginAccountView } from "@/types/margin-account";

// The margin account sheet, opened from the Markets banner, Home, Trader and Farm. A wallet that already has an account
// has nothing to open, so the sheet closes itself unless this visit is the one that opened it.
export function useMarginCreate(): MarginAccountView {
  const { markCreated, exists, known } = useMarginAccount();
  const signer = useWalletSigner();
  const address = signer.owner === null ? "" : shortAddress(marginAddress(new PublicKey(signer.owner)).toBase58());
  const [started, setStarted] = useState(false);

  const flow = useTransactionFlow({
    run: (_step, progress) => signer.execute(({ connection, owner, hooks }) => createMarginAccount(connection, owner, hooks), progress),
    success: { title: "Your margin account is open", message: address === "" ? "You can now trade Perps and Farm." : `Account ${address} is ready. Go long or short up to 5x.` },
  });

  useEffect(() => {
    if (flow.done) markCreated();
  }, [flow.done, markCreated]);

  useEffect(() => {
    if (known && exists && !started) router.back();
  }, [known, exists, started]);

  const phase = flow.state?.phase;
  const stage: EnvelopeStage = flow.done ? "open" : phase === "failure" || phase === undefined ? "sealed" : "waiting";

  return {
    address,
    intro: !started,
    stage,
    state: flow.state,
    open: () => {
      setStarted(true);
      flow.start();
    },
    dismiss: () => router.back(),
    onPrimary: () => {
      if (!flow.done) {
        flow.primary();
        return;
      }
      flow.close();
      router.back();
    },
    closeFlow: () => {
      flow.close();
      router.back();
    },
    openExplorer: flow.openExplorer,
  };
}
