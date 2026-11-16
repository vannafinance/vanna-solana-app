import { AccountStrip } from "@/components/account-strip";
import { ModulePage } from "@/components/module-page";
import { pct, usd } from "@/format";
import { Farm, farmTotals } from "@/screens/farm/farm";
import { useChain } from "@/state/chain";
import { usePersonal } from "@/state/personal";
import { useDataVersion } from "@/state/store";

// Farm: the hero is the Borrow & Trade account strip with the farm's value and net APY.
export default function FarmPage() {
  useDataVersion();
  const { chain } = useChain();
  const ready = usePersonal(chain);
  const T = farmTotals(chain);
  return (
    <ModulePage
      sections={[{ key: "farm", label: "Farm", family: "farm" }]}
      current="farm"
      heroAuto
      hero={<AccountStrip onRed third={{ label: "Farm", value: ready ? usd(T.val) : "—", sub: ready && T.val > 0 ? `${pct(T.apy)} net APY` : undefined }} />}
    >
      <Farm />
    </ModulePage>
  );
}
