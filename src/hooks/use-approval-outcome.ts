import { useSyncExternalStore } from "react";

import { getApprovalOutcome, setApprovalOutcome, subscribeApprovalOutcome } from "@/lib/preview-data/approval-outcome";

export function useApprovalOutcome() {
  const outcome = useSyncExternalStore(subscribeApprovalOutcome, getApprovalOutcome);
  return { outcome, setOutcome: setApprovalOutcome };
}
