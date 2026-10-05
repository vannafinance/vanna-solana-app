import { useEffect, useRef } from "react";

// A form that just sent something keeps its amount, so one more tap would send the same thing again. Once the success sheet
// has been dismissed, the amount is cleared. A cancelled or failed attempt never reaches this and keeps its amount.
export function useClearAfterSuccess(done: boolean, clear: () => void) {
  const wasDone = useRef(false);
  const latest = useRef(clear);
  useEffect(() => {
    latest.current = clear;
  }, [clear]);
  useEffect(() => {
    if (wasDone.current && !done) latest.current();
    wasDone.current = done;
  }, [done]);
}
