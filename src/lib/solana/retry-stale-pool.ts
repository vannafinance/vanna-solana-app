import type { SigningHooks } from "./send-transaction";
import { isStalePoolError } from "./transaction-errors";

const MAX_ATTEMPTS = 2;

// A pool the fork cloned earlier can drift from Jupiter's live quote. One retry that rebuilds everything from a fresh
// quote covers that, but never after the wallet has signed (that would ask the user to sign twice); other failures are
// not retried.
export async function withStalePoolRetry<T>(hooks: SigningHooks, run: (hooks: SigningHooks) => Promise<T>): Promise<T> {
  let signed = false;
  const tracked: SigningHooks = {
    sign: hooks.sign,
    onSigned: () => {
      signed = true;
      hooks.onSigned();
    },
  };
  let lastError: unknown;
  for (let tries = 0; tries < MAX_ATTEMPTS; tries++) {
    try {
      return await run(tracked);
    } catch (error) {
      lastError = error;
      if (signed || !isStalePoolError(error)) break;
    }
  }
  throw lastError;
}
