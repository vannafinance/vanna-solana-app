import { type ReactNode, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CHAIN_LABEL, sectionOn, useChain } from "@/state/chain";
import { useTheme } from "@/theme/use-theme";
import { families, type FamilyName, font } from "@/theme/tokens";

import { ModuleHeader } from "./module-header";
import { PagePill, Swap } from "./motion";
import { Card, EmptyCard } from "./ui/kit";

export type Section = { key: string; label: string; family: FamilyName };

type Props = {
  sections: Section[];
  current: string;
  onSection?: (key: string) => void;
  hero?: ReactNode;
  // a fixed content key: the page animates its own switch (Margin's form card)
  swapKey?: string;
  // the hero takes its content height (design V5: account-strip heroes) instead of the 234 px frame
  heroAuto?: boolean;
  children?: ReactNode;
};

// A module page: the module header in the section's family, the section pill (Earn | Predict, Spot | Perps), then content.
// Solana-only sections show the design's "Switch to Solana" card on Stellar.
export function ModulePage({ sections, current, onSection, hero, swapKey, heroAuto, children }: Props) {
  const { colors } = useTheme();
  const { chain, setChain } = useChain();
  const section = sections.find((s) => s.key === current) ?? sections[0];
  const fam = families[section.family];
  const available = sectionOn(section.key, chain);
  const [dir, setDir] = useState<1 | -1>(1);
  const idx = (k: string) => sections.findIndex((s) => s.key === k);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 24 }}>
      <ModuleHeader fam={fam} heroHeight={hero && !heroAuto ? 234 : null}>
        {hero ?? (
          <View style={{ gap: 4 }}>
            <Text style={styles.title}>{section.label}</Text>
            <Text style={styles.cap}>{CHAIN_LABEL[chain]} testnet</Text>
          </View>
        )}
      </ModuleHeader>
      {sections.length > 1 ? (
        <PagePill
          items={sections.map((s) => [s.key, s.label] as [string, string])}
          value={section.key}
          onChange={(k) => {
            setDir(idx(k) > idx(section.key) ? 1 : -1);
            onSection?.(k);
          }}
          fam={fam}
        />
      ) : null}
      <View style={styles.body}>
        <Swap k={`${swapKey ?? section.key}-${chain}`} dir={swapKey ? undefined : dir}>
          {available ? (
            <View style={{ gap: 12 }}>{children}</View>
          ) : (
            <EmptyCard title={`${section.label} is on Solana`} action="Switch to Solana" onAction={() => setChain("solana")} module="trade" />
          )}
        </Swap>
      </View>
    </ScrollView>
  );
}

export function PlaceholderCard({ title, lines }: { title: string; lines: string[] }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>{title}</Text>
      {lines.map((l) => (
        <Text key={l} style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted }}>
          • {l}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 28, lineHeight: 36 },
  cap: { color: "rgba(255,255,255,0.86)", fontFamily: font.regular, fontSize: 13 },
  body: { padding: 16 },
});
