import { previewResource } from "@/hooks/preview-resource";
import { previewAccount, previewLenderHistory, previewLenderPortfolio, previewSpot, previewVaults } from "@/lib/preview-data/home";
import type { LenderSummary } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

export function useLenderSummary(): Resource<LenderSummary> {
  const averageApy = Math.round(previewVaults.reduce((total, vault) => total + vault.supplyApyBps, 0) / previewVaults.length);

  return previewResource({
    portfolio: previewLenderPortfolio,
    totalHoldings: previewAccount.walletBalance + previewLenderPortfolio,
    suppliedAssets: previewVaults.length,
    avgSupplyApyBps: averageApy,
    vaults: previewVaults,
    spot: previewSpot,
    history: previewLenderHistory,
  });
}
