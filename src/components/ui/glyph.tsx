import type { ComponentType } from "react";

import { Icon } from "./icon";
import type { IconName } from "./material-symbols";

export type ComponentGlyph = ComponentType<{ size?: number; color?: string }>;
export type GlyphSource = IconName | ComponentGlyph;

type GlyphProps = {
  source: GlyphSource;
  size: number;
  color: string;
  filled?: boolean;
  bold?: boolean;
};

export function Glyph({ source, size, color, filled, bold }: GlyphProps) {
  if (typeof source === "string") return <Icon name={source} size={size} color={color} filled={filled} bold={bold} />;
  const Component = source;
  return <Component size={size} color={color} />;
}
