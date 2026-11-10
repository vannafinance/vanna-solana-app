// Design tokens from the V7 design (design/app.html, base.css), which took them from the shipped app's src/theme/tokens.ts.

export const light = {
  bg: "#F7F7F7",
  surface: "#FFFFFF",
  text: "#1F1F1F",
  muted: "#595959",
  divider: "#F4F4F4",
  border: "#E5E7EB",
  borderControl: "#8F94A0",
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
  blueTint: "#E9EEFF",
  onBlueTint: "#1B3290",
  chipActive: "#111111",
  onChipActive: "#FFFFFF",
  segment: "#F4F4F4",
  segmentActive: "#FFFFFF",
  disabled: "#DFDFDF",
  onDisabled: "#595959",
  scrim: "rgba(17,17,17,0.32)",
};

export type Palette = typeof light;

export const dark: Palette = {
  bg: "#111111",
  surface: "#1E1E1E",
  text: "#FFFFFF",
  muted: "#E2E2E2",
  divider: "#2C2C2C",
  border: "#2C2C2C",
  borderControl: "#6A6A6A",
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
  blueTint: "#1B2A66",
  onBlueTint: "#D3DEFF",
  chipActive: "#FFFFFF",
  onChipActive: "#111111",
  segment: "#111111",
  segmentActive: "#2C2C2C",
  disabled: "#2C2C2C",
  onDisabled: "#B5B5B5",
  scrim: "rgba(0,0,0,0.56)",
};

// Brand colours, theme independent.
export const brand = {
  primary: "#703AE6",
  long: "#32EEE2",
  short: "#FC5457",
  coral: "#FC5457",
  badge: "#FF007A",
  farm: "#FF007A",
  snackbar: "#2C2C2C",
};

// Module colour families (design base.css, V6 values): hero surface h0 → h1 (42%) → h2 at angle `hang`, a radial glow from the top
// right, a contrast veil, the bottom bar / pill highlight (n0 → n1), CTA (c0 → c1), ink, accent text (light / dark) and the tab fill.
export type Family = {
  h: [string, string, string];
  hang: number;
  glow: string;
  veil: number;
  n: [string, string];
  c: [string, string];
  ink: string;
  acc: [string, string];
  tab: string;
};

export const families = {
  portfolio: { h: ["#FC5457", "#703AE6", "#2F1B61"], hang: 127.3, glow: "rgba(255,176,214,0.38)", veil: 0, n: ["#FC5457", "#703AE6"], c: ["#8B4DF7", "#5A26C9"], ink: "#703AE6", acc: ["#1F1F1F", "#FFFFFF"], tab: "#703AE6" },
  earn: { h: ["#155F64", "#1C7C83", "#0E4A4E"], hang: 180, glow: "rgba(118,236,244,0.45)", veil: 0, n: ["#1C7C83", "#0E4A4E"], c: ["#1C7C83", "#0E4A4E"], ink: "#155F64", acc: ["#1C7C83", "#32E2EE"], tab: "#1C7C83" },
  predict: { h: ["#1C7C83", "#24A0A9", "#155F64"], hang: 180, glow: "rgba(161,242,247,0.55)", veil: 0.3, n: ["#24A0A9", "#155F64"], c: ["#24A0A9", "#155F64"], ink: "#155F64", acc: ["#1C7C83", "#5BE8F1"], tab: "#1C7C83" },
  margin: { h: ["#6B2766", "#B6479E", "#8E3784"], hang: 180, glow: "rgba(240,160,224,0.5)", veil: 0.14, n: ["#B6479E", "#8E3784"], c: ["#B6479E", "#6B2766"], ink: "#8E3784", acc: ["#8E3784", "#E3A3D8"], tab: "#8E3784" },
  spot: { h: ["#3E207F", "#8D61EB", "#6635D1"], hang: 180, glow: "rgba(211,194,247,0.55)", veil: 0.08, n: ["#8D61EB", "#6635D1"], c: ["#8D61EB", "#6635D1"], ink: "#6635D1", acc: ["#6635D1", "#BDA4F4"], tab: "#6635D1" },
  perps: { h: ["#2F1861", "#5029A3", "#3E207F"], hang: 180, glow: "rgba(159,123,238,0.5)", veil: 0, n: ["#6635D1", "#3E207F"], c: ["#5029A3", "#3E207F"], ink: "#5029A3", acc: ["#5029A3", "#9F7BEE"], tab: "#5029A3" },
  farm: { h: ["#8C0043", "#E8006F", "#B50057"], hang: 180, glow: "rgba(255,138,194,0.55)", veil: 0.02, n: ["#E8006F", "#B50057"], c: ["#E8006F", "#B50057"], ink: "#B50057", acc: ["#B50057", "#FF54A6"], tab: "#E8006F" },
  farmDn: { h: ["#6B0033", "#8C0043", "#6B0033"], hang: 180, glow: "rgba(255,84,166,0.42)", veil: 0, n: ["#B50057", "#6B0033"], c: ["#B50057", "#6B0033"], ink: "#8C0043", acc: ["#8C0043", "#FF8AC2"], tab: "#8C0043" },
  farmLp: { h: ["#B50057", "#FF3395", "#E8006F"], hang: 180, glow: "rgba(255,176,214,0.6)", veil: 0.17, n: ["#FF3395", "#B50057"], c: ["#FF3395", "#B50057"], ink: "#E8006F", acc: ["#B50057", "#FF8AC2"], tab: "#E8006F" },
} satisfies Record<string, Family>;

export type FamilyName = keyof typeof families;

// Brand gradient (logo, Margin centre button, avatar): Imperial Red 500 to Violet 500.
export const BRAND_GRADIENT: [string, string] = ["#FC5457", "#703AE6"];

export const font = {
  regular: "PlusJakartaSans_400Regular",
  semibold: "PlusJakartaSans_600SemiBold",
};
