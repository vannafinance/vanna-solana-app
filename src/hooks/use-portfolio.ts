import { previewResource } from "@/hooks/preview-resource";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { previewAccount, previewPositions, previewSpot } from "@/lib/preview-data/home";
import type { Portfolio } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

import { marginMetrics } from "./margin-metrics";

export function usePortfolio(): Resource<Portfolio> {
  const { exists } = useMarginAccount();
  const marginBalance = exists ? previewAccount.marginBalance : 0n;
  const totalBorrowed = exists ? previewAccount.totalBorrowed : 0n;

  return previewResource({
    walletBalance: previewAccount.walletBalance,
    marginBalance,
    totalBorrowed,
    netEarnings: previewAccount.netEarnings,
    ...marginMetrics(marginBalance, totalBorrowed),
    walletAddress: previewAccount.walletAddress,
    marginAddress: previewAccount.marginAddress,
    positions: exists ? previewPositions : [],
    assets: previewSpot,
  });
}
