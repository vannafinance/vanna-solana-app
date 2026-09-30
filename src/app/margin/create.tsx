import { router } from "expo-router";
import { TrendUp } from "phosphor-react-native";
import { View } from "react-native";

import { BorrowAgreementSheet } from "@/components/margin/borrow-agreement-sheet";
import { MarginIntroCard } from "@/components/margin/margin-intro-card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ProductHeader } from "@/components/ui/product-header";
import { Screen } from "@/components/ui/screen";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginCreate } from "@/hooks/use-margin-create";
import { useTheme } from "@/theme/use-theme";

export default function CreateMarginAccount() {
  const { spacing } = useTheme();
  const header = useHeaderProps();
  const create = useMarginCreate();
  const success = create.flow.state?.phase === "success";

  return (
    <>
      <Screen
        header={
          <ProductHeader product="perps" title="Perps" icon={TrendUp} onBack={() => router.back()} {...header}>
            <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
              <AppText variant="bodyLg" color="onHeroMuted">
                One-time setup
              </AppText>
              <AppText variant="display" color="onHero">
                Margin account needed
              </AppText>
            </View>
          </ProductHeader>
        }
      >
        <MarginIntroCard />
        <Button label="Create margin account" onPress={create.openAgreement} />
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
        onClose={create.onClose}
        primaryLabel={success ? "Start trading" : undefined}
        onExplorer={create.openExplorer}
      />
    </>
  );
}
