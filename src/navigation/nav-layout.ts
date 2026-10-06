// Three navigation layouts are on the table; the team picks one, then the other branches of each `NAV_LAYOUT` check are
// deleted.
// - "bottom-modules" (prototype V2): Portfolio, Earn, Trade and Farm in the bottom bar with Swap in its middle; the module's
//   own pages in the pill bar under the header.
// - "top-modules" (prototype V3, the original app's layout): the modules in the white pill bar over the header's bottom edge,
//   with Swap in its middle; the module's own pages in the bottom bar.
// - "header-modules" (prototype V4): the modules in a glass bar inside the header, just under the Vanna logo, with Swap in its
//   middle; the module's own pages in the bottom bar.
// Chosen at build time: EXPO_PUBLIC_NAV_LAYOUT=top-modules or header-modules, otherwise bottom-modules.
export type NavLayout = "bottom-modules" | "top-modules" | "header-modules";

const requested = process.env.EXPO_PUBLIC_NAV_LAYOUT;

export const NAV_LAYOUT: NavLayout = requested === "top-modules" || requested === "header-modules" ? requested : "bottom-modules";

// Whether the module's own pages are the bottom bar (true in V3 and V4).
export const PAGES_IN_BOTTOM_BAR = NAV_LAYOUT !== "bottom-modules";
