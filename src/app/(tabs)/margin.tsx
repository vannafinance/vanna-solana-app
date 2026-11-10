import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { Hero } from "@/components/hero";
import { ModulePage } from "@/components/module-page";
import { usd } from "@/format";
import { DATA } from "@/sample/data";
import { acct, hasMargin } from "@/sample/model";
import { type MarginAct, MarginBody, MarginChips, MarginHeroBody } from "@/screens/margin/margin";
import { useChain } from "@/state/chain";
import { usePersonal } from "@/state/personal";
import { useDataVersion } from "@/state/store";

// Margin (design V4: one page; the action switch Leverage | Repay | Transfer sits in the pill).
export default function Margin() {
  useDataVersion();
  const { chain } = useChain();
  const [act, setAct] = useState<MarginAct>("leverage");
  // The tab stays mounted, so coming back to it starts on Leverage again (as in V7), not on the last section used.
  useFocusEffect(useCallback(() => () => setAct("leverage"), []));
  const ready = usePersonal(chain);
  const has = ready && hasMargin(DATA[chain]);
  const a = acct(chain);
  const hero = (
    <View style={{ flex: 1, justifyContent: "space-between" }}>
      <Hero label="Net available collateral" value={ready ? usd(has ? a.equity : 0) : "—"} under={<MarginChips />} />
      <MarginHeroBody />
    </View>
  );
  return (
    <ModulePage
      sections={[
        { key: "leverage", label: "Leverage", family: "margin" },
        { key: "repay", label: "Repay", family: "margin" },
        { key: "transfer", label: "Transfer", family: "margin" },
      ]}
      current={act}
      onSection={(k) => setAct(k as MarginAct)}
      hero={hero}
      swapKey="margin"
    >
      <MarginBody act={act} setAct={setAct} />
    </ModulePage>
  );
}
