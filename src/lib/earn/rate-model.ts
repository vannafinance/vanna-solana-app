import type { RateSample } from "@/types/earn";

export type RateModel = {
  base: number;
  slope1: number;
  slope2: number;
  kink: number;
  // The share of interest the protocol keeps (the reserve factor); lenders are paid the rest.
  reserveFactor: number;
};

export function borrowRate(model: RateModel, utilization: number): number {
  if (model.kink === 0) return model.base;
  if (utilization <= model.kink) return model.base + (model.slope1 * utilization) / model.kink;
  return model.base + model.slope1 + (model.slope2 * (utilization - model.kink)) / (1 - model.kink);
}

// What lenders earn: borrowers' interest spread over all supplied funds, less the reserve fee the program keeps
// (fee = interest x reserve_factor, in the program's math reference).
export function lenderRate(model: RateModel, utilization: number): number {
  return borrowRate(model, utilization) * utilization * (1 - model.reserveFactor);
}

export function rateAt(model: RateModel, utilization: number): RateSample {
  return { utilization, borrow: borrowRate(model, utilization), lender: lenderRate(model, utilization) };
}

export function sampleCurve(model: RateModel, steps = 100): RateSample[] {
  return Array.from({ length: steps + 1 }, (_, index) => rateAt(model, index / steps));
}
