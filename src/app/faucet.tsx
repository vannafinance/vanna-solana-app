import { router } from "expo-router";

import { FaucetSheet } from "@/components/profile/faucet-sheet";
import { useFaucet } from "@/hooks/use-faucet";

export default function FaucetScreen() {
  const faucet = useFaucet();

  return (
    <FaucetSheet
      visible
      rows={faucet.rows}
      message={faucet.message}
      connected={faucet.connected}
      busy={faucet.busy}
      onClaim={faucet.claim}
      onClaimAll={faucet.claimAll}
      onDismiss={() => router.back()}
    />
  );
}
