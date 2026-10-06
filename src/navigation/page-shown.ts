import type { Space } from "@/theme/tokens";

type Shown = { page: object; space: Space; index: number };

// The page that most recently came into view, across every page of every module.
let last: Shown | null = null;

export type PageChange = { kind: "none" } | { kind: "module"; from: Space } | { kind: "page"; direction: 1 | -1 };

// Called as a module page comes into view. Says how the user got to it: from another module (`module`), from another page of the
// same module (`page`, with the direction along the page bar: 1 when it sits to the right of the one before), or not at all
// (`none`: the first page shown, or coming back to the same page from a detail screen opened on top of it).
export function notePageShown(page: object, space: Space, index: number): PageChange {
  const before = last;
  last = { page, space, index };
  if (before === null || before.page === page) return { kind: "none" };
  if (before.space !== space) return { kind: "module", from: before.space };
  return { kind: "page", direction: index > before.index ? 1 : -1 };
}
