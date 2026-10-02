import type { ComponentProps } from "react";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import type { MarginSetupView } from "@/types/margin-setup";

import { BorrowAgreementSheet } from "./borrow-agreement-sheet";
import { MarginActiveCard } from "./margin-active-card";
import { MarginIntroCard } from "./margin-intro-card";

type MarginSetupProps = {
  view: MarginSetupView;
  headerProps: Omit<ComponentProps<typeof SpaceHeader>, "space" | "children">;
};

// The one-time setup, shown inside the Trade tabs until the wallet has a margin account: intro, borrow agreement,
// wallet approval, then the active card.
export function MarginSetup({ view, headerProps }: MarginSetupProps) {
  return (
    <>
      <Screen
        gap={12}
        header={
          <SpaceHeader space="trade" {...headerProps}>
            <AppText strong color="onHero" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, letterSpacing: -0.56 }}>
              One-time setup
            </AppText>
          </SpaceHeader>
        }
      >
        {view.created ? (
          <>
            <MarginActiveCard address={view.marginAddress} />
            <Button label="Open a position" onPress={view.openPosition} />
          </>
        ) : (
          <>
            <MarginIntroCard />
            <Button label="Create margin account" onPress={view.openAgreement} />
          </>
        )}
      </Screen>
      <BorrowAgreementSheet
        visible={view.agreementOpen}
        openSection={view.openSection}
        agreed={view.agreed}
        onToggleSection={view.toggleSection}
        onToggleAgreed={view.toggleAgreed}
        onClose={view.closeAgreement}
        onSign={view.sign}
      />
      <TransactionSheet state={view.state} onPrimary={view.onPrimary} onClose={view.closeFlow} onExplorer={view.openExplorer} primaryLabel={view.done ? "Start trading" : undefined} />
    </>
  );
}
