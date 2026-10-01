import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { PoolFilterOption } from "@/types/earn";

type PoolMenuProps = {
  options: readonly PoolFilterOption[];
  value: PoolFilterOption["value"];
  onChange: (value: PoolFilterOption["value"]) => void;
};

const MENU_WIDTH = 220;

const labelOf = (value: PoolFilterOption["value"]) => (value === "all" ? "All pools" : value);

export function PoolMenu({ options, value, onChange }: PoolMenuProps) {
  return (
    <DropdownMenu
      label={labelOf(value)}
      accessibilityLabel={`Pool filter, ${labelOf(value)}`}
      menuWidth={MENU_WIDTH}
      value={value}
      onSelect={onChange}
      options={options.map((option) => ({ value: option.value, label: labelOf(option.value), badge: String(option.count) }))}
    />
  );
}
