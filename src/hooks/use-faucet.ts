import { useCallback, useState } from "react";

import { formatUnits } from "@/format/format-amount";
import { FORK_FAUCET_ENABLED } from "@/lib/solana/config";
import { FAUCET_CLAIM_LABEL, FAUCET_SYMBOLS, requestFaucetGrant, type FaucetSymbol } from "@/lib/solana/fork-faucet";
import type { ClaimStatus, FaucetMessage, FaucetRow } from "@/types/faucet";

import { useWalletSigner } from "./use-wallet-signer";

const SENT_VISIBLE_MS = 2400;

type Claims = Partial<Record<FaucetSymbol, ClaimStatus>>;

export function useFaucet() {
  const { owner, refreshAfterTransaction } = useWalletSigner();
  const [claims, setClaims] = useState<Claims>({});
  const [message, setMessage] = useState<FaucetMessage | null>(null);
  const busy = FAUCET_SYMBOLS.some((symbol) => claims[symbol] === "pending");

  const claim = useCallback(
    async (symbol: FaucetSymbol): Promise<boolean> => {
      if (owner === null) {
        setMessage({ tone: "negative", text: "Connect a wallet first." });
        return false;
      }
      setClaims((current) => ({ ...current, [symbol]: "pending" }));
      try {
        const grant = await requestFaucetGrant(symbol, owner);
        setClaims((current) => ({ ...current, [symbol]: "done" }));
        // The tick shows for a moment, then the tile is ready for another claim.
        setTimeout(() => setClaims((current) => (current[symbol] === "done" ? { ...current, [symbol]: "idle" } : current)), SENT_VISIBLE_MS);
        setMessage({ tone: "positive", text: `Added ${formatUnits(grant.added, grant.decimals, 2)} ${symbol} to your wallet` });
        refreshAfterTransaction();
        return true;
      } catch (error) {
        setClaims((current) => ({ ...current, [symbol]: "error" }));
        setMessage({ tone: "negative", text: error instanceof Error ? `${symbol}: ${error.message}` : `${symbol}: the faucet is not available right now.` });
        return false;
      }
    },
    [owner, refreshAfterTransaction],
  );

  // One at a time: the fork's faucet route and its airdrop both write the same wallet, and a run that stops on the first
  // failure would hide which tokens did arrive.
  const claimAll = useCallback(async () => {
    let added = 0;
    for (const symbol of FAUCET_SYMBOLS) if (await claim(symbol)) added += 1;
    setMessage(
      added === FAUCET_SYMBOLS.length
        ? { tone: "positive", text: "Added every test token to your wallet" }
        : { tone: "negative", text: `Added ${added} of ${FAUCET_SYMBOLS.length}. Tap Mint on a token to retry it.` },
    );
  }, [claim]);

  return {
    available: FORK_FAUCET_ENABLED,
    connected: owner !== null,
    rows: FAUCET_SYMBOLS.map((symbol): FaucetRow => ({ symbol, detail: FAUCET_CLAIM_LABEL[symbol], status: claims[symbol] ?? "idle" })),
    message,
    busy,
    claim: (symbol: FaucetSymbol) => void claim(symbol),
    claimAll: () => void claimAll(),
  };
}
