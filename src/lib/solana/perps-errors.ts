export class MarginAccountMissingError extends Error {
  constructor() {
    super("This wallet has no margin account.");
    this.name = "MarginAccountMissingError";
  }
}

export class UnsupportedPositionError extends Error {
  constructor() {
    super("This margin account holds a Farm position, which the app cannot size against yet.");
    this.name = "UnsupportedPositionError";
  }
}

export class UnsupportedRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedRouteError";
  }
}

export class PriceImpactError extends Error {
  constructor(readonly impactBps: number) {
    super(`The best route moves the price ${(impactBps / 100).toFixed(1)}%, so pool liquidity is too thin for this size. Try a smaller amount.`);
    this.name = "PriceImpactError";
  }
}

export class NoPositionError extends Error {
  constructor(readonly side: "long" | "short") {
    super(`There is no ${side} position to close.`);
    this.name = "NoPositionError";
  }
}
