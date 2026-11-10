import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { Hero } from "@/components/hero";
import { ModulePage } from "@/components/module-page";
import { pct, sUsd, usd } from "@/format";
import { earnTotals } from "@/screens/earn/model";
import { Earn, type EarnTab } from "@/screens/earn/views";
import { Predict, PredictHero, type PredictTab } from "@/screens/predict/predict";
import { useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";

// Lend (design group 'lend'): Earn | Predict in the pill; Predict is Solana only (Stellar shows the Switch to Solana card).
export default function Lend() {
  useDataVersion();
  const { chain } = useChain();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [section, setSection] = useState<"earn" | "predict">("earn");
  const [earnTab, setEarnTab] = useState<EarnTab>("vaults");
  const [predTab, setPredTab] = useState<PredictTab>("markets");

  // deep link from a finished transaction: Lend > Earn > Positions
  // (adjust state while rendering when the param changes; runs on mount too, like the effect it replaces)
  const [seenTab, setSeenTab] = useState<string | undefined>(undefined);
  if (params.tab !== seenTab) {
    setSeenTab(params.tab);
    if (params.tab === "positions") {
      setSection("earn");
      setEarnTab("positions");
    }
  }

  const T = earnTotals(chain);
  const hero =
    section === "earn" ? (
      <Hero
        label="Your supply"
        value={usd(T.val)}
        stats={[
          { label: "Assets", value: String(T.n) },
          { label: "Avg APY", value: T.n ? pct(T.apy) : "—" },
          T.earned > 0.005 ? { label: "Earned", value: sUsd(T.earned), tone: "pos" } : { label: "Earned", value: usd(T.earned) },
        ]}
      />
    ) : chain === "solana" ? (
      <PredictHero />
    ) : undefined;

  return (
    <ModulePage
      sections={[
        { key: "earn", label: "Earn", family: "earn" },
        { key: "predict", label: "Predict", family: "predict" },
      ]}
      current={section}
      onSection={(k) => setSection(k as "earn" | "predict")}
      hero={hero}
    >
      {section === "earn" ? <Earn tab={earnTab} setTab={setEarnTab} /> : <Predict tab={predTab} setTab={setPredTab} />}
    </ModulePage>
  );
}
