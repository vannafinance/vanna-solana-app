import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

import { useMarginAccount } from "@/hooks/use-margin-account";
import { useTransactionFlow } from "@/hooks/use-transaction-flow";
import { previewApproval } from "@/lib/preview-data/approval-outcome";
import { previewAccount } from "@/lib/preview-data/home";
import { shortAddress } from "@/format/short-address";
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
      throw new TransactionError("rejected", "Cancelled in Backpack", "You declined the request in Backpack. Nothing was sent.");
    }
    throw error;
  }
}

export function useMarginCreate() {
  const { markCreated } = useMarginAccount();
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);

  const flow = useTransactionFlow({
    run: approveMarginAccount,
    success: {
      title: "Margin account active",
      message: `Account ${shortAddress(previewAccount.marginAddress)} is ready. You can now trade Perps and Farm.`,
    },
  });

  useEffect(() => {
    if (flow.done) markCreated();
  }, [flow.done, markCreated]);

  const finish = () => {
    flow.close();
    if (flow.done) router.back();
  };

  return {
    flow,
    agreementOpen,
    agreed,
    openSection,
    marginAddress: previewAccount.marginAddress,
    openAgreement: () => setAgreementOpen(true),
    closeAgreement: () => setAgreementOpen(false),
    toggleAgreed: () => setAgreed((value) => !value),
    toggleSection: (index: number) => setOpenSection((current) => (current === index ? null : index)),
    sign: () => {
      setAgreementOpen(false);
      flow.start();
    },
    onPrimary: () => (flow.done ? finish() : flow.primary()),
    onClose: finish,
    openExplorer: () => void WebBrowser.openBrowserAsync(`https://solscan.io/account/${previewAccount.marginAddress}`),
  };
}
