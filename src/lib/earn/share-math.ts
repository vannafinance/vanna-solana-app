const EXCHANGE_RATE_SCALE = 1_000_000n;
const BPS = 10_000n;

export function sharesForAssets(assets: bigint, exchangeRate: bigint): bigint {
  return (assets * EXCHANGE_RATE_SCALE) / exchangeRate;
}

export function assetsForShares(shares: bigint, exchangeRate: bigint): bigint {
  return (shares * exchangeRate) / EXCHANGE_RATE_SCALE;
}

export function projectedYearlyUsd(assets: bigint, assetDecimals: number, priceUsd: bigint, apyBps: number): bigint {
  return (assets * priceUsd * BigInt(apyBps)) / (10n ** BigInt(assetDecimals) * BPS);
}

export function fractionOf(balance: bigint, fraction: number): bigint {
  if (fraction >= 1) return balance;
  return (balance * BigInt(Math.round(fraction * Number(BPS)))) / BPS;
}
