import { router } from "expo-router";
import { useState } from "react";
import { Linking } from "react-native";

import { formatPercent, formatToken } from "@/format/format-amount";
import { toInputText } from "@/lib/farm/amount-text";
import { buildDeployForm } from "@/lib/farm/deploy-form";
import { stepHeld } from "@/lib/farm/farm-math";
import { explorerAccountUrl } from "@/lib/solana/explorer";
import { nextFarmPositionId, addFarmPosition, farmCollaterals, farmPools } from "@/lib/preview-data/farm";
import { positionFromDeploy } from "@/lib/farm/position-math";
import { previewApproval } from "@/lib/preview-data/approval-outcome";
import { previewSession } from "@/lib/preview-data/session";
import type { CollateralSymbol, DeployForm, FarmCollateral, PoolSymbol } from "@/types/farm";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";
import { useMarginAccount } from "./use-margin-account";
import { useTransactionFlow } from "./use-transaction-flow";
import { routes } from "@/navigation/routes";

const DEFAULT_LEVERAGE = 2;
const LOW_PRECISION_DECIMALS = 6;

function balanceText(collateral: FarmCollateral) {
  return toInputText({ raw: collateral.balance, decimals: collateral.decimals });
}

function findCollateral(symbol: CollateralSymbol) {
  return farmCollaterals.find((collateral) => collateral.symbol === symbol);
}

export function useFarmDeploy() {
  const margin = useMarginAccount();
  const [poolSymbol, setPoolSymbol] = useState<PoolSymbol>("USDC");
  const [collateralSymbol, setCollateralSymbol] = useState<CollateralSymbol>("TSLAx");
  const [amountText, setAmountText] = useState(() => balanceText(farmCollaterals[0]));
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);

  const data = buildDeployForm({ pools: farmPools, collaterals: farmCollaterals, poolSymbol, collateralSymbol, amountText, leverage });
  const form: Resource<DeployForm> = previewResource(data);

  const borrowDigits = data.pool.decimals <= LOW_PRECISION_DECIMALS ? 2 : 3;

  const flow = useTransactionFlow({
    success: {
      title: "Strategy deployed",
      message: `${formatToken(data.amount, 2)} ${data.collateral.symbol} deposited · ${formatToken(data.quote.borrow, borrowDigits)} ${data.pool.symbol} earning ${formatPercent(data.pool.supplyApyBps)} on Kamino`,
    },
    run: async () => {
      await previewApproval();
      addFarmPosition(positionFromDeploy(nextFarmPositionId(data.collateral.symbol, data.pool.symbol), data, data.amount));
    },
  });

  const selectCollateral = (symbol: CollateralSymbol) => {
    const next = findCollateral(symbol);
    if (!next) return;
    setCollateralSymbol(symbol);
    setAmountText(balanceText(next));
  };

  const finishDeploy = () => {
    flow.close();
    router.navigate(routes.farmPositions);
  };

  return {
    form,
    needsMarginAccount: !margin.exists,
    selectPool: setPoolSymbol,
    selectCollateral,
    stepCollateral: (direction: 1 | -1) => selectCollateral(stepHeld(data.held, collateralSymbol, direction)),
    setAmountText,
    fillMax: () => setAmountText(balanceText(data.collateral)),
    setLeverage,
    deploy: () => (margin.exists ? flow.start() : router.push(routes.marginCreate)),
    sheet: {
      state: flow.state,
      primaryLabel: flow.done ? "View position" : undefined,
      onPrimary: flow.done ? finishDeploy : flow.primary,
      onClose: flow.close,
      onExplorer: () => void Linking.openURL(explorerAccountUrl(previewSession.walletAddress)),
    },
  };
}
