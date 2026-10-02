import { router } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

import { shortAddress } from "@/format/short-address";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { useTransactionFlow } from "@/hooks/use-transaction-flow";
import { useWalletSigner } from "@/hooks/use-wallet-signer";
import { DEFAULT_MARKET } from "@/lib/perps/build-markets";
import { createMarginAccount } from "@/lib/solana/margin-transactions";
import { marginAddress } from "@/lib/solana/program-accounts";
import { spaceRoutes } from "@/navigation/routes";

export function useMarginCreate() {
  const { markCreated, exists } = useMarginAccount();
  const signer = useWalletSigner();
  const address = signer.owner === null ? null : marginAddress(new PublicKey(signer.owner)).toBase58();
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [created, setCreated] = useState(false);

  const flow = useTransactionFlow({
    run: (_step, progress) => signer.execute(({ connection, owner, hooks }) => createMarginAccount(connection, owner, hooks), progress),
    success: {
      title: "Margin account active",
      message: address === null ? "Your margin account is ready. You can now trade Perps and Farm." : `Account ${shortAddress(address)} is ready. You can now trade Perps and Farm.`,
    },
  });

  if (flow.done && !created) setCreated(true);

  useEffect(() => {
    if (flow.done) markCreated();
  }, [flow.done, markCreated]);

  return {
    flow,
    created: created || exists,
    agreementOpen,
    agreed,
    openSection,
    marginAddress: address === null ? "" : shortAddress(address),
    openAgreement: () => setAgreementOpen(true),
    closeAgreement: () => setAgreementOpen(false),
    toggleAgreed: () => setAgreed((value) => !value),
    toggleSection: (index: number) => setOpenSection((current) => (current === index ? null : index)),
    sign: () => {
      setAgreementOpen(false);
      flow.start();
    },
    onPrimary: () => {
      if (!flow.done) {
        flow.primary();
        return;
      }
      flow.close();
      router.replace(spaceRoutes.trade);
    },
    openPosition: () => router.replace(`/trade/order/${DEFAULT_MARKET}?side=long`),
  };
}
