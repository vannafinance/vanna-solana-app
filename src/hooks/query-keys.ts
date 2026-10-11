export const queryKeys = {
  accountSnapshot: (wallet: string) => ["account-snapshot", wallet] as const,
  walletHoldings: (wallet: string) => ["wallet-holdings", wallet] as const,
  earnDeposits: (wallet: string) => ["earn-deposits", wallet] as const,
  earnEvents: (wallet: string) => ["earn-events", wallet] as const,
  spotSwaps: (wallet: string) => ["spot-swaps", wallet] as const,
  kaminoPositions: (wallet: string) => ["kamino-positions", wallet] as const,
  walletTransactions: (wallet: string) => ["wallet-transactions", wallet] as const,
};
