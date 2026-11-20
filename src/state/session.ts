import AsyncStorage from "@react-native-async-storage/async-storage";

import { hydrateWallets, walletState } from "./wallets";

// The intro plays on every fresh open. A reload was landing inside the app because the phone had saved "welcome seen". That flag is
// kept only for the rest of this run (Explore first / finish sign-in), then the next launch shows the intro again, EXCEPT when the
// app was last used less than RESUME_MS (1 minute) ago by a signed-in wallet: the phone only closed it in the background, so it opens on the
// screen the person was on (a short pause, not a restart).
const KEY = "vanna.welcomeSeen";
const ACTIVE_KEY = "vanna.lastActive";
const PATH_KEY = "vanna.lastPath";
export const RESUME_MS = 60 * 1000;
let welcomeSeen = false;
let resumePath: string | null = null;
export const isWelcomeSeen = () => welcomeSeen;
export const markWelcomeSeen = () => {
  welcomeSeen = true;
  AsyncStorage.setItem(KEY, "1").catch(() => {});
};

/** Notes that the app is in use now (called when it goes to the background and when the screen changes). */
export const rememberActive = () => void AsyncStorage.setItem(ACTIVE_KEY, String(Date.now())).catch(() => {});
/** Notes the screen the person is on, to open it again after a short background pause. */
export const rememberPath = (path: string) => {
  AsyncStorage.setItem(PATH_KEY, path).catch(() => {});
  rememberActive();
};
/** The screen to open on this start, once (null when the intro plays). */
export const takeResumePath = () => {
  const p = resumePath;
  resumePath = null;
  return p;
};

export async function hydrateSession() {
  const [, , last, path] = await Promise.all([AsyncStorage.removeItem(KEY).catch(() => {}), hydrateWallets(), AsyncStorage.getItem(ACTIVE_KEY).catch(() => null), AsyncStorage.getItem(PATH_KEY).catch(() => null)]);
  welcomeSeen = false;
  const recent = last != null && Date.now() - Number(last) < RESUME_MS;
  if (recent && walletState().signedIn) {
    welcomeSeen = true;
    resumePath = path && !path.startsWith("/welcome") && !path.startsWith("/sign-in") ? path : null;
  }
}
