import AsyncStorage from "@react-native-async-storage/async-storage";

import { hydrateWallets } from "./wallets";

// The intro plays on every fresh open. A reload was landing inside the app because the phone
// had saved "welcome seen". That flag is kept only for the rest of this run (Explore first / finish
// sign-in), then the next launch shows the intro again.
const KEY = "vanna.welcomeSeen";
let welcomeSeen = false;
export const isWelcomeSeen = () => welcomeSeen;
export const markWelcomeSeen = () => {
  welcomeSeen = true;
  AsyncStorage.setItem(KEY, "1").catch(() => {});
};

export async function hydrateSession() {
  await Promise.all([AsyncStorage.removeItem(KEY).catch(() => {}), hydrateWallets()]);
  welcomeSeen = false;
}
