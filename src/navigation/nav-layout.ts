// Three navigation layouts are on the table; the team picks one, then the other branches of each `NAV_LAYOUT` check are
// deleted.
// - "bottom-modules" (prototype V2): Portfolio, Earn, Trade and Farm in the bottom bar with Swap in its middle; the module's
//   own pages in the pill bar under the header.
// - "top-modules" (prototype V3, the original app's layout): the modules in the white pill bar over the header's bottom edge,
//   with Swap in its middle; the module's own pages in the bottom bar.
// - "header-modules" (prototype V4): the modules in a glass bar inside the header, just under the Vanna logo, with Swap in its
//   middle; the module's own pages in the bottom bar.
// This branch ships V4: modules under the logo, pages in the bottom bar. EXPO_PUBLIC_NAV_LAYOUT still overrides it (the prototype build uses that to show all three).
export type NavLayout = "bottom-modules" | "top-modules" | "header-modules";

const requested = process.env.EXPO_PUBLIC_NAV_LAYOUT;

const SHIPPED: NavLayout = "header-modules";

export const NAV_LAYOUT: NavLayout = requested === "bottom-modules" || requested === "top-modules" || requested === "header-modules" ? requested : SHIPPED;

// Whether the module's own pages are the bottom bar (true in V3 and V4).
export const PAGES_IN_BOTTOM_BAR = NAV_LAYOUT !== "bottom-modules";
