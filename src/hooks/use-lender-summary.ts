import { previewResource } from "@/hooks/preview-resource";
import { previewAccount, previewLenderHistory, previewLenderPortfolio, previewSpot, previewVaults } from "@/lib/preview-data/home";
import type { LenderSummary } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

export function useLenderSummary(): Resource<LenderSummary> {
  const weightedApy = previewVaults.reduce((total, vault) => total + Number(vault.value) * vault.supplyApyBps, 0);
  const averageApy = Math.round(weightedApy / Number(previewVaults.reduce((total, vault) => total + vault.value, 0n)));

  return previewResource({
    portfolio: previewLenderPortfolio,
    totalHoldings: previewAccount.walletBalance + previewLenderPortfolio,
    avgSupplyApyBps: averageApy,
    vaults: previewVaults,
    spot: previewSpot,
    history: previewLenderHistory,
  });
}
