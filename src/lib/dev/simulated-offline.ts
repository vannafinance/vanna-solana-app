// Developer switch (Profile, development builds only): behave as if the data sources were unreachable.
const listeners = new Set<() => void>();
let offline = false;

export const simulatedOffline = {
  get: () => offline,
  set: (next: boolean) => {
    offline = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
