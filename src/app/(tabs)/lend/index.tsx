import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { Hero } from "@/components/hero";
import { ModulePage } from "@/components/module-page";
import { pct, sUsd, usd } from "@/format";
import { earnTotals } from "@/screens/earn/model";
import { Earn, type EarnTab } from "@/screens/earn/views";
import { useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";

// Lend (design group 'lend'): Earn.
export default function Lend() {
  useDataVersion();
  const { chain } = useChain();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [earnTab, setEarnTab] = useState<EarnTab>("vaults");

  // deep link from a finished transaction: Lend > Earn > Positions
  // (adjust state while rendering when the param changes; runs on mount too, like the effect it replaces)
  const [seenTab, setSeenTab] = useState<string | undefined>(undefined);
  if (params.tab !== seenTab) {
    setSeenTab(params.tab);
    if (params.tab === "positions") setEarnTab("positions");
  }

  const T = earnTotals(chain);
  const hero = (
    <Hero
      label="Your supply"
      value={usd(T.val)}
      stats={[
        { label: "Assets", value: String(T.n) },
        { label: "Avg APY", value: T.n ? pct(T.apy) : "—" },
        T.earned > 0.005 ? { label: "Earned", value: sUsd(T.earned), tone: "pos" } : { label: "Earned", value: usd(T.earned) },
      ]}
    />
  );

  return (
    <ModulePage sections={[{ key: "earn", label: "Earn", family: "earn" }]} current="earn" hero={hero}>
      <Earn tab={earnTab} setTab={setEarnTab} />
    </ModulePage>
  );
}
