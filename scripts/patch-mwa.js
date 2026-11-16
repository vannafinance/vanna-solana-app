// The Solana wallet library always shows Android's wallet list. This lets a call name one wallet app so it opens directly.
// Runs after every install; safe to run twice.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "node_modules", "@solana-mobile", "mobile-wallet-adapter-protocol", "android", "src", "main", "java", "com", "solanamobile", "mobilewalletadapter", "reactnative", "SolanaMobileWalletAdapterModule.kt");

if (fs.existsSync(file)) {
  const source = fs.readFileSync(file, "utf8");
  const marker = 'config?.getString("packageName")';
  if (!source.includes(marker)) {
    const anchor = /(localAssociation\.session\s*\)\r?\n)/;
    if (!anchor.test(source)) throw new Error("patch-mwa: the wallet library changed; update scripts/patch-mwa.js");
    fs.writeFileSync(file, source.replace(anchor, `$1                ${marker}?.let { intent.setPackage(it) }\n`));
  }
}
