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

// Redeeming the whole position is exact. A partial amount rounds up to a whole share so the wallet receives at least
// what was typed, and never asks for more shares than the wallet holds.
export function sharesToRedeem(amount: bigint, supplied: bigint, held: bigint, exchangeRate: bigint): bigint {
  if (amount >= supplied) return held;
  const wanted = (amount * EXCHANGE_RATE_SCALE + exchangeRate - 1n) / exchangeRate;
  return wanted > held ? held : wanted;
}
