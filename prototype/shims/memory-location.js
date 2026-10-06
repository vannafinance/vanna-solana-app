// In-memory location and history for the app inside the prototype's iframe.
//
// The app runs in an `srcdoc` iframe, whose `window.location` is `about:srcdoc` and whose real history cannot be
// pushed to. Expo Router reads the location and drives the history (see the expo-router patches in
// ../overrides.js), so both are replaced here by a small stack under a fake origin. Every change dispatches a
// `vn-route` event on the window so the outer page can follow the route if it wants to.

const ORIGIN = "https://app.vanna.prototype";
const entries = [{ state: null, url: "/" }];
let index = 0;

function toAppUrl(url) {
  const resolved = new URL(url, ORIGIN + entries[index].url);
  return resolved.pathname + resolved.search + resolved.hash;
}

function announce() {
  try {
    window.dispatchEvent(new CustomEvent("vn-route", { detail: entries[index].url }));
  } catch (error) {}
}

globalThis.__vnLocation = () => new URL(entries[index].url, ORIGIN);

globalThis.__vnHistory = {
  get state() {
    return entries[index].state;
  },
  get length() {
    return entries.length;
  },
  pushState(state, _title, url) {
    entries.splice(index + 1);
    entries.push({ state, url: url == null ? entries[index].url : toAppUrl(url) });
    index = entries.length - 1;
    announce();
  },
  replaceState(state, _title, url) {
    entries[index] = { state, url: url == null ? entries[index].url : toAppUrl(url) };
    announce();
  },
  go(delta) {
    const next = Math.max(0, Math.min(entries.length - 1, index + (delta || 0)));
    if (next === index) return;
    index = next;
    announce();
    setTimeout(() => window.dispatchEvent(new PopStateEvent("popstate", { state: entries[index].state })), 0);
  },
  back() {
    this.go(-1);
  },
  forward() {
    this.go(1);
  },
};
