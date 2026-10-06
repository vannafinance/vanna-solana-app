// Device colour scheme for the prototype.
//
// react-native-web answers `Appearance` / `useColorScheme()` from the browser's `prefers-color-scheme`. In the
// prototype the "phone" theme is chosen in the outer control panel instead, so the shared Appearance object is
// patched in place: the panel sets the device scheme through `globalThis.__vnAppearance.setDevice()`, and the app's
// own Profile > Appearance setting (which calls `Appearance.setColorScheme`) overrides it, like on Android.

import Appearance from "react-native-web/dist/exports/Appearance";

let device = "light";
let override = null;
const listeners = new Set();

const effective = () => override || device;
const notify = () => listeners.forEach((listener) => listener({ colorScheme: effective() }));

Appearance.getColorScheme = effective;
Appearance.setColorScheme = (scheme) => {
  override = scheme === "light" || scheme === "dark" ? scheme : null;
  notify();
};
Appearance.addChangeListener = (listener) => {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
};

globalThis.__vnAppearance = {
  setDevice(scheme) {
    device = scheme === "dark" ? "dark" : "light";
    notify();
  },
  get device() {
    return device;
  },
  get effective() {
    return effective();
  },
};
