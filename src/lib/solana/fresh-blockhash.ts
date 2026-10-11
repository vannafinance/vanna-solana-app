import type { Connection, VersionedTransaction } from "@solana/web3.js";

const REFRESH_MS = 1500;
const REMEMBERED = 64;

const lifetimes = new Map<string, number>();

function remember(blockhash: string, lastValidBlockHeight: number) {
  lifetimes.set(blockhash, lastValidBlockHeight);
  const oldest = lifetimes.keys().next();
  if (lifetimes.size > REMEMBERED && !oldest.done) lifetimes.delete(oldest.value);
}

// How long the blockhash a transaction was actually signed with stays valid; the figure read when the transaction was built
// is older and would call a good transaction expired too early.
export function lastValidHeightOf(blockhash: string, fallback: number): number {
  return lifetimes.get(blockhash) ?? fallback;
}

// A blockhash on the fork lives about a minute, and a wallet app that has to be opened and then approved can use most of
// that before it signs. A transaction only becomes bytes once the wallet session is ready, so until the wallet answers it is
// re-stamped with the newest blockhash, which makes the age that counts the time spent at the approval screen.
export async function signWithFreshBlockhash<T>(connection: Connection, transactions: readonly VersionedTransaction[], sign: () => Promise<T>): Promise<T> {
  let waiting = true;
  const restamp = () =>
    connection.getLatestBlockhash("confirmed").then(
      (latest) => {
        if (!waiting) return;
        remember(latest.blockhash, latest.lastValidBlockHeight);
        for (const transaction of transactions) transaction.message.recentBlockhash = latest.blockhash;
      },
      // A missed refresh leaves the blockhash the transaction already has, which is still good for a while.
      () => undefined,
    );

  const timer = setInterval(restamp, REFRESH_MS);
  void restamp();
  try {
    return await sign();
  } finally {
    waiting = false;
    clearInterval(timer);
  }
}
