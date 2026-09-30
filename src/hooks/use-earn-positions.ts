import { summarizePortfolio, totalEarnedUsd } from "@/lib/earn/portfolio";
import { previewVaults, previewWalletUsd } from "@/lib/preview-data/earn";
import type { EarnPortfolio, EarnPosition } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";

export function useEarnPositions(): Resource<EarnPortfolio> {
  const positions = previewVaults.flatMap((vault): EarnPosition[] =>
    vault.position
      ? [
          {
            vaultId: vault.id,
            symbol: vault.symbol,
            supplied: vault.position.supplied,
            valueUsd: vault.position.valueUsd,
            supplyApyBps: vault.supplyApyBps,
            earnedUsd: vault.position.earnedUsd,
          },
        ]
      : [],
  );

  return previewResource({
    summary: summarizePortfolio(positions, previewWalletUsd),
    positions,
    earnedUsd: totalEarnedUsd(positions),
  });
}
