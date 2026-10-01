import { router } from "expo-router";
import { useEffect, useState } from "react";

import { shortAddress } from "@/format/short-address";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { useTransactionFlow } from "@/hooks/use-transaction-flow";
import { previewApproval } from "@/lib/preview-data/approval-outcome";
import { previewAccount } from "@/lib/preview-data/home";
import { previewMarkets } from "@/lib/preview-data/perps";
import { spaceRoutes } from "@/navigation/routes";
import { TransactionError } from "@/types/transaction";

async function approveMarginAccount() {
  try {
    await previewApproval();
  } catch (error) {
    if (!(error instanceof TransactionError)) throw error;
    if (error.kind === "no-fee") {
      throw new TransactionError(
        "no-fee",
        "Not enough SOL for fees",
        "Every Solana transaction needs a tiny SOL fee, about 0.00001 SOL. Add a little SOL to your wallet, then try again.",
      );
    }
    if (error.kind === "rejected") {
      throw new TransactionError("rejected", "Cancelled in your wallet", "You declined the wallet request. Nothing was sent.");
    }
    throw error;
  }
}

export function useMarginCreate() {
  const { markCreated } = useMarginAccount();
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [created, setCreated] = useState(false);

  const flow = useTransactionFlow({
    run: approveMarginAccount,
    success: {
      title: "Margin account active",
      message: `Account ${shortAddress(previewAccount.marginAddress)} is ready. You can now trade Perps and Farm.`,
    },
  });

  if (flow.done && !created) setCreated(true);

  useEffect(() => {
    if (flow.done) markCreated();
  }, [flow.done, markCreated]);

  return {
    flow,
    created,
    agreementOpen,
    agreed,
    openSection,
    marginAddress: shortAddress(previewAccount.marginAddress),
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
    openPosition: () => router.replace(`/trade/order/${previewMarkets[0].symbol}?side=long`),
  };
}
