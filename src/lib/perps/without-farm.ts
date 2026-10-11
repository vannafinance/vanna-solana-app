import type { AssetSymbol } from "@/lib/solana/assets";
import type { FarmPosition } from "@/types/farm";

type Balances = Partial<Record<AssetSymbol, bigint>>;

const minus = (balance: bigint | undefined, amount: bigint) => {
  const left = (balance ?? 0n) - amount;
  return left > 0n ? left : 0n;
};

// A Farm position keeps its stock as margin collateral and owes the pool asset, which looks like a long to the perps
// reading of the account. Taking the Farm amounts out first leaves only what belongs to perps positions.
export function withoutFarm(balances: { collateral: Balances; debt: Balances }, positions: readonly FarmPosition[]): { collateral: Balances; debt: Balances } {
  const collateral = { ...balances.collateral };
  const debt = { ...balances.debt };
  for (const position of positions) {
    collateral[position.collateralSymbol] = minus(collateral[position.collateralSymbol], position.collateral.raw);
    debt[position.poolSymbol] = minus(debt[position.poolSymbol], position.principal.raw + position.interest.raw);
  }
  return { collateral, debt };
}
