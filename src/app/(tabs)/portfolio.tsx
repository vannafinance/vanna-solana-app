import { useRef, useState } from "react";
import { ScrollView, type ScrollViewInstance, StyleSheet, View } from "react-native";

import { PagePill, Swap } from "@/components/motion";
import { PortfolioHero } from "@/screens/portfolio/hero";
import { Lender } from "@/screens/portfolio/lender";
import { Overview } from "@/screens/portfolio/overview";
import type { PfPage, TraderSub } from "@/screens/portfolio/shared";
import { Trader } from "@/screens/portfolio/trader";
import { useChain } from "@/state/chain";
import { useTheme } from "@/theme/use-theme";
import { families } from "@/theme/tokens";

const PAGES: [PfPage, string][] = [["overview", "Overview"], ["lender", "Lender"], ["trader", "Trader"]];
const order = (p: PfPage) => PAGES.findIndex(([k]) => k === p);

export default function Portfolio() {
  const { colors } = useTheme();
  const { chain } = useChain();
  const [page, setPage] = useState<PfPage>("overview");
  const [dir, setDir] = useState<1 | -1>(1);
  const [traderSub, setTraderSub] = useState<TraderSub>("margin");
  const scroll = useRef<ScrollViewInstance>(null);

  const go = (p: PfPage) => {
    if (p === page) return;
    setDir(order(p) > order(page) ? 1 : -1);
    setPage(p);
  };

  return (
    <ScrollView ref={scroll} style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 24 }}>
      <PortfolioHero />
      <PagePill items={PAGES} value={page} onChange={go} fam={families.portfolio} />
      <View style={styles.body}>
        <Swap k={`${page}-${chain}`} dir={dir}>
          {page === "overview" && (
            <Overview
              openLender={() => go("lender")}
              openTrader={(sub) => {
                if (sub) setTraderSub(sub);
                go("trader");
              }}
            />
          )}
          {page === "lender" && <Lender />}
          {page === "trader" && <Trader sub={traderSub} setSub={setTraderSub} />}
        </Swap>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
});
