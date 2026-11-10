import { useState } from "react";

import { AccountStrip } from "@/components/account-strip";
import { ModulePage } from "@/components/module-page";
import { pct, usd } from "@/format";
import { CATS, type Cat, Farm, farmTotals } from "@/screens/farm/farm";
import { useChain } from "@/state/chain";
import { usePersonal } from "@/state/personal";
import { useDataVersion } from "@/state/store";

// Farm: the categories sit in the pill; the hero is the Borrow & Trade account strip with the farm's value and net APY.
export default function FarmPage() {
  useDataVersion();
  const { chain } = useChain();
  const [cat, setCat] = useState<Cat>("lending");
  const cats = CATS[chain];
  const cur = cats.some((c) => c[0] === cat) ? cat : "lending";
  const ready = usePersonal(chain);
  const T = farmTotals(chain);
  return (
    <ModulePage
      sections={cats.map(([k, label, family]) => ({ key: k, label, family }))}
      current={cur}
      onSection={(k) => setCat(k as Cat)}
      heroAuto
      hero={<AccountStrip onRed third={{ label: "Farm", value: ready ? usd(T.val) : "—", sub: ready && T.val > 0 ? `${pct(T.apy)} net APY` : undefined }} />}
    >
      <Farm cat={cur} />
    </ModulePage>
  );
}
