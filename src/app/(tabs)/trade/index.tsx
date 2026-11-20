import { useTabReset } from "@/state/tab-reset";
import { useState } from "react";

import { AccountStrip } from "@/components/account-strip";
import { ModulePage } from "@/components/module-page";
import { usd } from "@/format";
import { acct } from "@/sample/model";
import { type PerpTab, Perps } from "@/screens/trade/perps";
import { Spot } from "@/screens/trade/spot";
import { useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";

// Trade (design group 'trade'): Spot | Perps in the pill (Spot has Swap | History sub-tabs). Hero = the Borrow & Trade account strip.
type Sec = "spot" | "perps";
function Trade() {
  useDataVersion();
  const { chain } = useChain();
  const [section, setSection] = useState<Sec>("spot");
  const [perpTab, setPerpTab] = useState<PerpTab>("markets");
  const a = acct(chain);
  return (
    <ModulePage
      key={chain}
      sections={
        [
          { key: "spot", label: "Spot", family: "spot" },
          { key: "perps", label: "Perps", family: "perps" },
        ]
      }
      current={section}
      onSection={(k) => setSection(k as Sec)}
      heroAuto
      hero={<AccountStrip third={section === "perps" ? { label: "Perps value", value: usd(a.perpEq) } : { label: "Available", value: usd(Math.max(a.availUsd, a.equity > 0 ? a.equity : 0)) }} />}
    >
      {section === "spot" ? <Spot /> : <Perps tab={perpTab} setTab={setPerpTab} />}
    </ModulePage>
  );
}

// Tapping this tab's icon in the bottom bar again builds the page afresh (state/tab-reset.ts).
export default function TradeRoot() {
  const reset = useTabReset("trade");
  return <Trade key={reset} />;
}
