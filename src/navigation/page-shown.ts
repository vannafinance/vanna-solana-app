import type { Space } from "@/theme/tokens";

type Shown = { page: object; space: Space; index: number };

// The page that most recently came into view, across every page of every module.
let last: Shown | null = null;

export type PageChange = { kind: "none" } | { kind: "module"; from: Space } | { kind: "page"; direction: 1 | -1; fromIndex: number };

export type Arrival = { page: object; change: PageChange };

let arrival: Arrival | null = null;
const listeners = new Set<() => void>();

// Called as a module page comes into view. Says how the user got to it: from another module (`module`), from another page of the
// same module (`page`, with the direction along the page bar: 1 when it sits to the right of the one before), or not at all
// (`none`: the first page shown, or coming back to the same page from a detail screen opened on top of it).
export function notePageShown(page: object, space: Space, index: number): PageChange {
  const before = last;
  last = { page, space, index };
  const change: PageChange =
    before === null || before.page === page
      ? { kind: "none" }
      : before.space !== space
        ? { kind: "module", from: before.space }
        : { kind: "page", direction: index > before.index ? 1 : -1, fromIndex: before.index };
  arrival = { page, change };
  listeners.forEach((listener) => listener());
  return change;
}

// The page's header reads how its page arrived, so it can start in the previous module's colours or slide its highlight from the
// previous page.
export function subscribeArrival(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getArrival() {
  return arrival;
}
