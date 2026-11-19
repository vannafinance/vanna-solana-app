// The Solana wallet library always shows Android's wallet list and times out after 10 s (too short when a chooser or cold
// wallet starts). This lets a call name one wallet app so it opens directly, and raises the association wait to 45 s.
// Runs after every install; safe to run twice.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "node_modules", "@solana-mobile", "mobile-wallet-adapter-protocol", "android", "src", "main", "java", "com", "solanamobile", "mobilewalletadapter", "reactnative", "SolanaMobileWalletAdapterModule.kt");

if (fs.existsSync(file)) {
  let source = fs.readFileSync(file, "utf8");
  const marker = 'config?.getString("packageName")';
  if (!source.includes(marker)) {
    const anchor = /(localAssociation\.session\s*\)\r?\n)/;
    if (!anchor.test(source)) throw new Error("patch-mwa: the wallet library changed; update scripts/patch-mwa.js");
    source = source.replace(anchor, `$1                ${marker}?.let { intent.setPackage(it) }\n`);
  }
  source = source.replace(/ASSOCIATION_TIMEOUT_MS\s*=\s*10000\b/, "ASSOCIATION_TIMEOUT_MS = 45000");
  // Each wallet request (authorize, sign) is cut off after 90 s. Phantom shows several screens for a fork transaction (Request blocked,
  // Confirm (unsafe), Are you sure, tick, Yes) and on a slow phone that can take longer, so the request timed out while the person was
  // still approving. 5 minutes. Needs a native rebuild to take effect.
  source = source.replace(/CLIENT_TIMEOUT_MS\s*=\s*90000\b/, "CLIENT_TIMEOUT_MS = 300000");
  fs.writeFileSync(file, source);
}
