import { useTheme } from "@/theme/use-theme";

export type PfPage = "overview" | "lender" | "trader";
export type TraderSub = "margin" | "spot" | "perps" | "farm";

// Split bar / dot colours (portfolio.js C): wallet, lending, margin, predict. Theme aware.
export function usePfColors() {
  const { colors, isDark } = useTheme();
  return {
    w: colors.borderControl,
    l: colors.positive,
    m: colors.link,
    p: isDark ? "#9DB4FF" : "#2440A9",
    text: colors.text,
    muted: colors.muted,
    pos: colors.positive,
    neg: colors.negative,
  };
}
