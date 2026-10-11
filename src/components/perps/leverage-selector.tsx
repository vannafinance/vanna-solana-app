import { LeverageCard } from "@/components/farm/leverage-card";

type LeverageSelectorProps = {
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
};

// The leverage of a Long or Short: the same slider as Farm, from the smallest to the largest the market allows.
export function LeverageSelector({ options, value, onChange }: LeverageSelectorProps) {
  return <LeverageCard leverage={value} minLeverage={options[0]} maxLeverage={options[options.length - 1]} onChangeLeverage={onChange} />;
}
