// Every place where the prototype build differs from the Android app. Used by metro.config.js (module redirects)
// and babel-transformer.js (source patches). The shims themselves are documented in shims/.
const path = require("path");

const SHIMS = path.join(__dirname, "shims");

/** Packages replaced wholesale, by import specifier. */
const PACKAGE_REDIRECTS = {
  // Mobile Wallet Adapter session -> wallet stand-in sheet.
  "@solana-mobile/mobile-wallet-adapter-protocol-web3js": path.join(SHIMS, "packages/mwa-transact.js"),
  // Native WebView (perps chart) -> iframe with a sample chart.
  "react-native-webview": path.join(SHIMS, "packages/webview.js"),
};

/**
 * App modules replaced by a shim, by path relative to the app root. Every import that resolves to the file gets the
 * shim instead, except the shim's own import of it (the lib/ wrappers re-export the original and override one function).
 */
const APP_REDIRECTS = {
  "src/hooks/use-wallet-signer.ts": path.join(SHIMS, "hooks/use-wallet-signer.js"),
  "src/lib/solana/oracle-prices.ts": path.join(SHIMS, "lib/oracle-prices.js"),
  "src/lib/solana/earn-deposits.ts": path.join(SHIMS, "lib/earn-deposits.js"),
  "src/lib/solana/wallet-holdings.ts": path.join(SHIMS, "lib/wallet-holdings.js"),
  "src/lib/solana/vault-accounts.ts": path.join(SHIMS, "lib/vault-accounts.js"),
  "src/lib/solana/farm-positions.ts": path.join(SHIMS, "lib/farm-positions.js"),
  "src/lib/solana/kamino.ts": path.join(SHIMS, "lib/kamino.js"),
  "src/lib/solana/wallet-transactions.ts": path.join(SHIMS, "lib/wallet-transactions.js"),
  "src/lib/solana/fork-faucet.ts": path.join(SHIMS, "lib/fork-faucet.js"),
};

/**
 * Source patches for library files (path inside node_modules -> [search, replace] pairs, every occurrence).
 * Expo Router reads `window.location` / drives `window.history`; inside the prototype's srcdoc iframe those are
 * `about:srcdoc`, so these files read the in-memory location of shims/memory-location.js instead.
 */
const LOCATION = ["window.location", "(globalThis.__vnLocation?globalThis.__vnLocation():window.location)"];
const HISTORY = ["window.history", "(globalThis.__vnHistory||window.history)"];
const SOURCE_PATCHES = {
  "expo-router/build/ExpoRoot.js": [LOCATION],
  "expo-router/build/link/linking.js": [LOCATION],
  "expo-router/build/fork/useLinking.js": [LOCATION],
  "expo-router/build/fork/createMemoryHistory.js": [HISTORY],
  "expo-router/build/react-navigation/native/useLinking.js": [LOCATION],
  "expo-router/build/react-navigation/native/createMemoryHistory.js": [HISTORY],
};

/** Applies SOURCE_PATCHES to a file's source; throws if a patch no longer matches (library changed). */
function patchSource(filename, src) {
  const normalized = filename.split(path.sep).join("/");
  const marker = "/node_modules/";
  const at = normalized.lastIndexOf(marker);
  if (at === -1) return src;
  const patches = SOURCE_PATCHES[normalized.slice(at + marker.length)];
  if (!patches) return src;
  let out = src;
  for (const [search, replace] of patches) {
    if (!out.includes(search)) throw new Error(`[prototype] patch "${search}" no longer matches ${normalized}`);
    out = out.split(search).join(replace);
  }
  return out;
}

const isShim = (filename) => path.resolve(filename).startsWith(SHIMS + path.sep);

module.exports = { SHIMS, PACKAGE_REDIRECTS, APP_REDIRECTS, SOURCE_PATCHES, patchSource, isShim };
