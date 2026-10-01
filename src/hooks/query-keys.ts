export const queryKeys = {
  accountSnapshot: (wallet: string) => ["account-snapshot", wallet] as const,
  walletHoldings: (wallet: string) => ["wallet-holdings", wallet] as const,
  earnDeposits: (wallet: string) => ["earn-deposits", wallet] as const,
  earnEvents: (wallet: string) => ["earn-events", wallet] as const,
};
