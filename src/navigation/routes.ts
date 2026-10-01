export const routes = {
  notifications: "/notifications",
  profile: "/profile",
  marginCreate: "/margin/create",
  tradeSwap: "/trade/swap",
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
