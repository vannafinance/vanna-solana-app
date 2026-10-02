import type { RateSample } from "@/types/earn";

export type RateModel = {
  base: number;
  slope1: number;
  slope2: number;
  kink: number;
};

export function borrowRate(model: RateModel, utilization: number): number {
  if (model.kink === 0) return model.base;
  if (utilization <= model.kink) return model.base + (model.slope1 * utilization) / model.kink;
  return model.base + model.slope1 + (model.slope2 * (utilization - model.kink)) / (1 - model.kink);
}

export function lenderRate(model: RateModel, utilization: number): number {
  return borrowRate(model, utilization) * utilization;
}

export function rateAt(model: RateModel, utilization: number): RateSample {
  return { utilization, borrow: borrowRate(model, utilization), lender: lenderRate(model, utilization) };
}

export function sampleCurve(model: RateModel, steps = 100): RateSample[] {
  return Array.from({ length: steps + 1 }, (_, index) => rateAt(model, index / steps));
}
