// The shipped Solana app's intro colours (vanna-solana-app src/theme/tokens.ts), kept local so the ported intro stays 1:1.
export const brand = {
  primary: "#703AE6",
  short: "#FC5457",
  onHero: "#FFFFFF",
  onHeroMuted: "rgba(255,255,255,0.96)",
  heroGlass: "rgba(255,255,255,0.16)",
  heroDivider: "rgba(255,255,255,0.34)",
} as const;

export const palette = {
  dark: { background: "#111111", surface: "#1E1E1E", link: "#CBB6FA", textMuted: "#B5B5B5", onDisabled: "#8A8A8A", purpleTint: "#2F1B61", onPurpleTint: "#E1D5FA" },
} as const;

export const spaces = { farm: { panel: ["#E0006B", "#9A0049"] } } as const;
