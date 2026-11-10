import { useState } from "react";

import { AccountStrip } from "@/components/account-strip";
import { ModulePage } from "@/components/module-page";
import { usd } from "@/format";
import { acct } from "@/sample/model";
import { type PerpTab, Perps } from "@/screens/trade/perps";
import { Spot } from "@/screens/trade/spot";
import { useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";

// Trade (design group 'trade'). Solana: Spot | Perps in the pill (Spot has Swap | History sub-tabs). Stellar has no perps, so the
// pill itself is Swap | History. Hero = the Borrow & Trade account strip.
type Sec = "spot" | "perps" | "swap" | "history";
export default function Trade() {
  useDataVersion();
  const { chain } = useChain();
  const [solSec, setSolSec] = useState<"spot" | "perps">("spot");
  const [xlmSec, setXlmSec] = useState<"swap" | "history">("swap");
  const [perpTab, setPerpTab] = useState<PerpTab>("markets");
  const a = acct(chain);
  const stellar = chain === "stellar";
  const section: Sec = stellar ? xlmSec : solSec;
  return (
    <ModulePage
      key={chain}
      sections={
        stellar
          ? [
              { key: "swap", label: "Swap", family: "spot" },
              { key: "history", label: "History", family: "spot" },
            ]
          : [
              { key: "spot", label: "Spot", family: "spot" },
              { key: "perps", label: "Perps", family: "perps" },
            ]
      }
      current={section}
      onSection={(k) => (stellar ? setXlmSec(k as "swap" | "history") : setSolSec(k as "spot" | "perps"))}
      heroAuto
      hero={<AccountStrip third={section === "perps" ? { label: "Perps value", value: usd(a.perpEq) } : { label: "Available", value: usd(a.availUsd) }} />}
    >
      {stellar ? <Spot page={xlmSec} /> : solSec === "spot" ? <Spot /> : <Perps tab={perpTab} setTab={setPerpTab} />}
    </ModulePage>
  );
}
