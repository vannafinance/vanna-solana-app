import { diagonalGradient } from "./gradient";

export const palette = {
  light: {
    background: "#F7F7F7",
    surface: "#FFFFFF",
    text: "#1F1F1F",
    textMuted: "#595959",
    divider: "#F4F4F4",
    border: "#E5E7EB",
    positive: "#1C7C83",
    negative: "#B33C3E",
    link: "#703AE6",
    warning: "#8C0043",
    purpleTint: "#F1EBFD",
    onPurpleTint: "#5029A3",
    tealTint: "#EBFCFD",
    onTealTint: "#155F64",
    pinkTint: "#FFE6F2",
    onPinkTint: "#8C0043",
    chipActive: "#111111",
    onChipActive: "#FFFFFF",
    segment: "#F4F4F4",
    segmentActive: "#FFFFFF",
    disabled: "#DFDFDF",
    onDisabled: "#595959",
    scrim: "rgba(17,17,17,0.32)",
    nav: "#111111",
  },
  dark: {
    background: "#111111",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    textMuted: "#BFBFBF",
    divider: "#2C2C2C",
    border: "#2C2C2C",
    positive: "#32EEE2",
    negative: "#FC5457",
    link: "#BDA4F4",
    warning: "#FFB0D6",
    purpleTint: "#2F1B61",
    onPurpleTint: "#D3C2F7",
    tealTint: "#155F64",
    onTealTint: "#BFF6FA",
    pinkTint: "#6B0033",
    onPinkTint: "#FFB0D6",
    chipActive: "#FFFFFF",
    onChipActive: "#111111",
    segment: "#111111",
    segmentActive: "#2C2C2C",
    disabled: "#2C2C2C",
    onDisabled: "#949494",
    scrim: "rgba(0,0,0,0.56)",
    nav: "#2C2C2C",
  },
} as const;

export const brand = {
  primary: "#703AE6",
  onPrimary: "#FFFFFF",
  long: "#32EEE2",
  short: "#FC5457",
  onHero: "#FFFFFF",
  onHeroMuted: "rgba(255,255,255,0.72)",
  heroGlass: "rgba(255,255,255,0.16)",
  heroDivider: "rgba(255,255,255,0.24)",
  heroPositive: "#32EEE2",
} as const;

export const gradients = {
  home: diagonalGradient([["#FC5457", -0.25], ["#703AE6", 0.45], ["#2F1B61", 1.1]]),
  perps: diagonalGradient([["#8D61EB", -0.1], ["#703AE6", 0.35], ["#2F1B61", 1.1]]),
  swap: diagonalGradient([["#FF007A", -0.3], ["#703AE6", 0.55], ["#3E207F", 1.1]]),
  earn: diagonalGradient([["#703AE6", -0.2], ["#3E207F", 0.5], ["#111111", 1.25]]),
  farm: diagonalGradient([["#FC5457", -0.2], ["#FF007A", 0.4], ["#8C0043", 1.1]]),
} as const;

export const spaces = {
  portfolio: { band: ["#1A0B2E", "#2A1150"], panel: ["#5B2BC0", "#3B1C82"] },
  earn: { band: ["#04181A", "#0A2E31"], panel: ["#137A82", "#0A464B"] },
  trade: { band: ["#0B0C2A", "#161A55"], panel: ["#3F3AD8", "#231F86"] },
  farm: { band: ["#2A0618", "#4A0A2C"], panel: ["#E0006B", "#9A0049"] },
} as const;

export type Space = keyof typeof spaces;

export type Product = keyof typeof gradients;

export const health = { liquidation: 1.1, safeFrom: 1.5 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 16, lg: 24, hero: 28, pill: 999 } as const;

export const fontSize = { caption: 12, label: 13, body: 14, bodyLg: 16, title: 18, heading: 22, display: 34 } as const;

export const fontFamily = {
  regular: "PlusJakartaSans_400Regular",
  semibold: "PlusJakartaSans_600SemiBold",
} as const;

export const minTouchTarget = 44;
