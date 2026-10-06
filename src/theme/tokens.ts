import { diagonalGradient } from "./gradient";

export const palette = {
  light: {
    background: "#F7F7F7",
    surface: "#FFFFFF",
    text: "#1F1F1F",
    textMuted: "#595959",
    divider: "#F4F4F4",
    border: "#E5E7EB",
    borderControl: "#8F94A0",
    // The outline of a button that has no fill, which has to read as a shape on its own.
    borderStrong: "#E5E7EB",
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
    textMuted: "#E2E2E2",
    divider: "#2C2C2C",
    border: "#2C2C2C",
    borderControl: "#6A6A6A",
    borderStrong: "#5A5A5A",
    positive: "#32EEE2",
    negative: "#FC5457",
    link: "#CBB6FA",
    warning: "#FFB0D6",
    purpleTint: "#2F1B61",
    onPurpleTint: "#E1D5FA",
    tealTint: "#155F64",
    onTealTint: "#BFF6FA",
    pinkTint: "#6B0033",
    onPinkTint: "#FFB0D6",
    chipActive: "#FFFFFF",
    onChipActive: "#111111",
    segment: "#111111",
    segmentActive: "#2C2C2C",
    disabled: "#2C2C2C",
    onDisabled: "#B5B5B5",
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
  onHeroMuted: "rgba(255,255,255,0.96)",
  onHeroSoft: "rgba(255,255,255,0.98)",
  heroRule: "rgba(255,255,255,0.26)",
  heroRuleSoft: "rgba(255,255,255,0.28)",
  heroGlass: "rgba(255,255,255,0.16)",
  heroDivider: "rgba(255,255,255,0.34)",
  heroPositive: "#32EEE2",
  healthWatch: "#FF8AC2",
  watchlist: "#9F7BEE",
  unreadDot: "#FF007A",
  badgeNegative: "#B33C3E",
  badgePositive: "#1C7C83",
  badgeInfo: "#2440A9",
  earnTab: "#11727A",
  tradeTab: "#4B44E0",
  engraved: "#17131F",
  engravedRule: "rgba(255,255,255,0.10)",
  coral: "#FC5457",
  badge: "#FF007A",
  farmAccent: "#FF007A",
  snackbar: "#2C2C2C",
  onSnackbar: "#FFFFFF",
  walletScrim: "rgba(10,8,18,0.18)",
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

// One palette family per module, so the four never read as the same place: Portfolio is Vanna's home in the brand's
// coral-to-violet gradient, Earn is Electric Blue (teal), Margin trade is Violet, Farm is Rose.
export const spaceGradients = {
  portfolio: { nav: ["#FC5457", "#703AE6"], cta: ["#8B4DF7", "#5A26C9"] },
  earn: { nav: ["#2FC9C1", "#11838B"], cta: ["#14919A", "#0B5F66"] },
  trade: { nav: ["#8D61EB", "#5029A3"], cta: ["#703AE6", "#5029A3"] },
  // Rose only: the coral that used to start this gradient read as red (Short / loss) and did not match the header.
  farm: { nav: ["#FF3395", "#E2087A"], cta: ["#E2087A", "#B0005A"] },
} as const satisfies Record<Space, { nav: readonly [string, string]; cta: readonly [string, string] }>;

// The header of each space is one surface that runs from a deep top into the space's colour, with a glow in its top right corner.
// Portfolio, Vanna's home, wears the brand gradient itself (coral to violet to deep violet, corner to corner, as in the logo), so
// it stays distinct from Margin trade's plain violet and never sinks into the dark page. `scrim` backs the status bar once the
// page scrolls under it.
type SpaceHeader = {
  surface: readonly [string, string, string];
  glow: string;
  scrim: string;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

export const spaceHeaders = {
  portfolio: { surface: ["#FC5457", "#703AE6", "#2F1B61"], glow: "rgba(255,176,214,0.38)", scrim: "#6B3BD8", start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  earn: { surface: ["#07494F", "#11838B", "#0B5F66"], glow: "rgba(110,236,226,0.6)", scrim: "#07494F" },
  trade: { surface: ["#2F1861", "#703AE6", "#5029A3"], glow: "rgba(189,164,244,0.7)", scrim: "#2F1861" },
  farm: { surface: ["#86003F", "#E2087A", "#A3004F"], glow: "rgba(255,120,190,0.72)", scrim: "#86003F" },
} as const satisfies Record<Space, SpaceHeader>;

export const spaceInk = { portfolio: "#703AE6", earn: "#11838B", trade: "#5029A3", farm: "#E2087A" } as const satisfies Record<Space, string>;

export const brandGradient = ["#FC5457", "#703AE6"] as const;

export const horizontalGradient = { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } } as const;

export type Product = keyof typeof gradients;

export const health = { liquidation: 1.1, safeFrom: 1.5 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { xs: 4, tag: 6, chip: 8, sm: 12, md: 16, lg: 24, hero: 28, sheet: 28, pill: 999 } as const;

export const shadows = {
  light: {
    card: { shadowColor: "#111111", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
    menu: { shadowColor: "#111111", shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
    floating: { shadowColor: "#110B2E", shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
    pill: { shadowColor: "#110B2E", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    snackbar: { shadowColor: "#111111", shadowOpacity: 0.24, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  },
  dark: {
    card: { elevation: 0 },
    menu: { shadowColor: "#000000", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
    floating: { shadowColor: "#000000", shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
    pill: { shadowColor: "#000000", shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    snackbar: { shadowColor: "#000000", shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  },
} as const;

export const layout = { sheetMaxWidth: 640, headerHeight: 56, handleWidth: 36, handleHeight: 4 } as const;

export const motion = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.05, 0.7, 0.1, 1],
  duration: { short: 180, medium: 240, long: 320 },
} as const;

export const fontSize = { caption: 12, label: 13, body: 14, bodyLg: 16, title: 18, heading: 20, display: 34 } as const;

export const fontFamily = {
  regular: "PlusJakartaSans_400Regular",
  semibold: "PlusJakartaSans_600SemiBold",
} as const;

export const minTouchTarget = 44;
