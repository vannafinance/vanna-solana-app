import { type Href, router } from "expo-router";
import { useState } from "react";

import { connectAndAddWallet } from "@/chain/connect-wallet";
import { HeroStage } from "@/components/intro/hero-stage";
import { PillButton } from "@/components/intro/pill-button";
import { RiseIn } from "@/components/intro/rise-in";
import { useRewards } from "@/sample/rewards";
import { markWelcomeSeen } from "@/state/session";
import { useWallets } from "@/state/wallets";

// Welcome: the intro plays once, then one button rises in. Connect wallet opens Android's own wallet chooser straight away
// (every Solana wallet on the phone is listed there); Continue when this phone is already connected. A new person then picks a name.
// The action takes its space from the first frame, so the orbit never moves when it appears.
const START_AT = 3550;

export default function Welcome() {
  const { signedIn } = useWallets();
  const me = useRewards();
  const [waiting, setWaiting] = useState(false);
  const enter = () => {
    markWelcomeSeen();
    router.replace("/portfolio" as Href);
  };
  const connect = async () => {
    if (waiting) return;
    setWaiting(true);
    const w = await connectAndAddWallet();
    setWaiting(false);
    if (!w) return;
    markWelcomeSeen();
    // Someone who already picked a name goes straight in; a new person picks one first.
    if (me.name !== "Maya") enter();
    else router.replace("/sign-in" as Href);
  };
  return (
    <HeroStage intro>
      <RiseIn delay={START_AT} distance={12} duration={520} style={{ width: "100%" }}>
        <PillButton
          label={signedIn ? "Continue" : waiting ? "Waiting for your wallet…" : "Connect wallet"}
          height={56}
          shineAfter={START_AT + 750}
          onPress={signedIn ? enter : connect}
        />
      </RiseIn>
    </HeroStage>
  );
}
