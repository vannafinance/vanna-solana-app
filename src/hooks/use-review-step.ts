import { useState } from "react";

import type { ReviewData } from "@/types/review";

// The step between pressing the action button and the wallet opening. The sheet shows only while it was asked for, and
// confirming it is what starts the transaction.
export function useReviewStep(build: () => ReviewData | null, onConfirm: () => void) {
  const [requested, setRequested] = useState(false);

  return {
    data: requested ? build() : null,
    request: () => setRequested(true),
    cancel: () => setRequested(false),
    confirm: () => {
      setRequested(false);
      onConfirm();
    },
  };
}
