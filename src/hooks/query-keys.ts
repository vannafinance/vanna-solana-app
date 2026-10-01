export const queryKeys = {
  accountSnapshot: (wallet: string) => ["account-snapshot", wallet] as const,
  walletHoldings: (wallet: string) => ["wallet-holdings", wallet] as const,
};
