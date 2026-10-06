export const routes = {
  notifications: "/notifications",
  profile: "/profile",
  faucet: "/faucet",
  marginCreate: "/margin/create",
  // Swap is wallet-only and sits outside the modules (the round button in the bottom bar).
  swap: "/swap",
  tradePositions: "/trade/positions",
  tradeHistory: "/trade/history",
  farmPositions: "/farm/positions",
} as const;

export const spaceRoutes = {
  portfolio: "/home",
  earn: "/earn",
  trade: "/trade",
  farm: "/farm",
} as const;
