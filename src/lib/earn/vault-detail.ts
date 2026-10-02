import { PublicKey } from "@solana/web3.js";

import { formatPercent } from "@/format/format-amount";
import { formatShortDate } from "@/format/format-date";
import { netPrincipal } from "@/lib/portfolio/net-earnings";
import type { ValuedDeposit } from "@/lib/portfolio/value-deposits";
import { type AssetSymbol, assets } from "@/lib/solana/assets";
import { VANNA_PROGRAM_ID } from "@/lib/solana/config";
import type { EarnEvent } from "@/lib/solana/earn-history";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { PoolStats } from "@/lib/solana/pools-api";
import { assetConfigAddress, associatedTokenAddress, reserveAddress, shareMintAddress, tokenProgramOf } from "@/lib/solana/program-accounts";
import type { VaultAccounts } from "@/lib/solana/vault-accounts";
import type { VaultCollateralAsset, VaultContract, VaultDetail, VaultLimit, VaultPosition, VaultPositionEvent } from "@/types/earn";

import { buildVaultSummaries } from "./build-vaults";
import { capUsageBps } from "./cap-usage";
import { vaultId, vaultMeta } from "./vault-meta";

const POOL_RATE_TO_UI_RATE = 1000n;
const LIQUIDATION_HEALTH = "1.1";

type Input = {
  id: string;
  pools: Partial<Record<AssetSymbol, PoolStats>>;
  prices: OraclePrices;
  accounts: Partial<Record<AssetSymbol, VaultAccounts>>;
  deposit: ValuedDeposit | undefined;
  events: readonly EarnEvent[];
};

function positionOf(deposit: ValuedDeposit, symbol: AssetSymbol, events: readonly EarnEvent[]): VaultPosition {
  const principal = netPrincipal(events).get(symbol);
  const gain = principal === undefined ? null : deposit.supplied - (principal > 0n ? principal : 0n);
  return {
    supplied: { raw: deposit.supplied, decimals: deposit.decimals },
    shares: { raw: deposit.shares, decimals: deposit.decimals },
    valueUsd: deposit.value,
    earned: gain === null ? null : { raw: gain > 0n ? gain : 0n, decimals: deposit.decimals },
  };
}

// Everything on the vault screen comes from the reserve and its asset configuration on the chain, the pool rates and the
// oracle price, plus the connected wallet's own supplies and withdrawals. Nothing here is an estimate.
export function buildVaultDetail({ id, pools, prices, accounts, deposit, events }: Input): VaultDetail | null {
  const asset = assets.find((candidate) => vaultId(candidate.symbol) === id);
  if (!asset) return null;
  const { symbol, decimals } = asset;
  const summary = buildVaultSummaries(pools, prices, deposit ? [deposit] : []).find((candidate) => candidate.symbol === symbol);
  const chain = accounts[symbol];
  const pool = pools[symbol];
  const price = prices[symbol];
  if (!summary || !chain || !pool || price === undefined) return null;

  const { reserve, limits } = chain;
  const amount = (raw: bigint) => ({ raw, decimals });
  const supplied = reserve.accountedLiquidity + reserve.totalBorrowAssets - reserve.accruedFees;
  const mint = new PublicKey(asset.mint);
  const reserveKey = reserveAddress(mint);
  const own = events.filter((event) => event.symbol === symbol);

  const contracts: VaultContract[] = [
    { label: `v${symbol} token`, address: shareMintAddress(mint).toBase58() },
    { label: `${symbol} reserve`, address: reserveKey.toBase58() },
    { label: "Liquidity vault", address: associatedTokenAddress(reserveKey, mint, tokenProgramOf(asset)).toBase58() },
    { label: "Asset configuration", address: assetConfigAddress(mint).toBase58() },
    { label: "Vanna program", address: VANNA_PROGRAM_ID },
  ];
  const limitRows: VaultLimit[] = [
    { label: "Loan to value", value: formatPercent(limits.ltvBps, 0) },
    { label: "Liquidation threshold", value: formatPercent(limits.liquidationThresholdBps, 0) },
    { label: "Per margin account", value: limits.maxCollateralPerMargin === 0n ? "No limit" : `${limits.maxCollateralPerMargin} base units` },
  ];
  const collateralAssets: VaultCollateralAsset[] = assets.flatMap((other) => {
    const config = accounts[other.symbol]?.limits;
    return config ? [{ symbol: other.symbol, collateral: config.collateralEnabled, borrow: config.borrowEnabled, liquidationBonusBps: config.liquidationBonusBps }] : [];
  });
  const activity: VaultPositionEvent[] = own.map((event) => ({
    kind: event.kind,
    amount: event.amount === null ? null : amount(event.amount),
    date: formatShortDate(event.timestamp / 1000),
    signature: event.signature,
  }));

  return {
    ...summary,
    name: vaultMeta[symbol].name,
    shareSymbol: `v${symbol}`,
    decimals,
    priceUsd: price,
    utilizationBps: Math.round(pool.utilizationPercent * 100),
    borrowApyBps: Math.round(pool.borrowApyPercent * 100),
    supplied: amount(supplied),
    borrowed: amount(reserve.totalBorrowAssets),
    availableLiquidity: amount(reserve.accountedLiquidity - reserve.accruedFees),
    liquidationBonusBps: limits.liquidationBonusBps,
    liquidationHealthFactor: LIQUIDATION_HEALTH,
    oracleSource: "Pyth",
    oracleMaxAgeSeconds: limits.maxPriceAgeSeconds,
    shareExchangeRate: pool.exchangeRate / POOL_RATE_TO_UI_RATE,
    reserveFactorBps: reserve.reserveFactorBps,
    supplyCap: reserve.supplyCap === 0n ? null : amount(reserve.supplyCap),
    borrowCap: reserve.borrowCap === 0n ? null : amount(reserve.borrowCap),
    supplyCapUsageBps: reserve.supplyCap === 0n ? null : capUsageBps(supplied, reserve.supplyCap),
    borrowCapUsageBps: reserve.borrowCap === 0n ? null : capUsageBps(reserve.totalBorrowAssets, reserve.borrowCap),
    contracts,
    limits: limitRows,
    collateralAssets,
    activity,
    position: deposit && deposit.supplied > 0n ? positionOf(deposit, symbol, own) : undefined,
  };
}
