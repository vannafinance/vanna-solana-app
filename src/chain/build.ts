// This build always talks to the real chain with the wallet the person connects (Mobile Wallet Adapter): there are no stand-in wallets or
// sample accounts any more. (It was `dynamic.available` in the combined app, which told a development build from Expo Go.)
export const REAL_BUILD = true;

