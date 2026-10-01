import { BorrowAgreementSheet } from "@/components/margin/borrow-agreement-sheet";
import { MarginActiveCard } from "@/components/margin/margin-active-card";
import { MarginIntroCard } from "@/components/margin/margin-intro-card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginCreate } from "@/hooks/use-margin-create";

export default function CreateMarginAccount() {
  const header = useHeaderProps();
  const create = useMarginCreate();

  return (
    <>
      <Screen
        gap={12}
        header={
          <SpaceHeader space="trade" {...header}>
            <AppText strong color="onHero" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, letterSpacing: -0.56 }}>
              One-time setup
            </AppText>
          </SpaceHeader>
        }
      >
        {create.created ? (
          <>
            <MarginActiveCard address={create.marginAddress} />
            <Button label="Open a position" onPress={create.openPosition} />
          </>
        ) : (
          <>
            <MarginIntroCard />
            <Button label="Create margin account" onPress={create.openAgreement} />
          </>
        )}
      </Screen>
      <BorrowAgreementSheet
        visible={create.agreementOpen}
        openSection={create.openSection}
        agreed={create.agreed}
        onToggleSection={create.toggleSection}
        onToggleAgreed={create.toggleAgreed}
        onClose={create.closeAgreement}
        onSign={create.sign}
      />
      <TransactionSheet
        state={create.flow.state}
        onPrimary={create.onPrimary}
        onClose={create.flow.close}
        primaryLabel={create.flow.done ? "Start trading" : undefined}
      />
    </>
  );
}
