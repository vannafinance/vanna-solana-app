import { useMemo } from "react";

import { summarizePortfolio } from "@/lib/perps/summarize-portfolio";
import { previewAccount, previewClosedPositions, previewMarkets, previewPositions } from "@/lib/preview-data/perps";
import type { PerpsPortfolio } from "@/types/perps";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";

export function usePerpsPositions(): Resource<PerpsPortfolio> {
  return useMemo(
    () =>
      previewResource(
        summarizePortfolio({
          margin: previewAccount.margin,
          borrowed: previewAccount.borrowed,
          markets: previewMarkets,
          positions: previewPositions,
          closed: previewClosedPositions,
        }),
      ),
    [],
  );
}
