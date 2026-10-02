// 0.01 SOL covers network fees and the rent for the token accounts a supply may create.
const SOL_FEE_RESERVE = 10_000_000n;

export function spendableBalance(symbol: string, balance: bigint): bigint {
  if (symbol !== "SOL") return balance;
  return balance > SOL_FEE_RESERVE ? balance - SOL_FEE_RESERVE : 0n;
}
