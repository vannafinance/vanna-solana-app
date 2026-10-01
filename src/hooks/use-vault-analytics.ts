import { VANNA_RATE_MODEL, rateAt, sampleCurve } from "@/lib/earn/rate-model";
import { previewVaults } from "@/lib/preview-data/earn";
import { PREVIEW_NOW, previewApyHistory } from "@/lib/preview-data/earn-series";
import type { VaultAnalytics } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";

export function useVaultAnalytics(id: string): Resource<VaultAnalytics> {
  const vault = previewVaults.find((candidate) => candidate.id === id);
  if (!vault) return { status: "empty" };

  const utilization = vault.utilizationBps / 10_000;
  return previewResource({
    now: PREVIEW_NOW,
    apy: {
      "7D": previewApyHistory(utilization, "7D"),
      "30D": previewApyHistory(utilization, "30D"),
      "90D": previewApyHistory(utilization, "90D"),
    },
    curve: {
      samples: sampleCurve(VANNA_RATE_MODEL),
      kink: rateAt(VANNA_RATE_MODEL, VANNA_RATE_MODEL.kink),
      current: rateAt(VANNA_RATE_MODEL, utilization),
    },
  });
}
