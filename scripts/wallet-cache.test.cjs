const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const { PublicKey } = require("@solana/web3.js");
const ts = require("typescript");

const source = readFileSync("src/lib/solana/wallet-cache.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadCache(stored = null, storageError = false) {
  let value = stored;
  const storage = {
    async getItem() {
      if (storageError) throw new Error("Storage unavailable");
      return value;
    },
    async setItem(key, next) { value = next; },
    async removeItem() { value = null; },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "@react-native-async-storage/async-storage") return { __esModule: true, default: storage };
      if (name === "@solana/web3.js") return { PublicKey };
      if (name === "@wallet-ui/react-native-web3js") {
        return { toUint8Array: (address) => new Uint8Array(Buffer.from(address, "base64")) };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { cache: exports.walletCache, stored: () => value };
}

const address = new PublicKey(new Uint8Array(32).fill(1));
const account = {
  address,
  publicKey: address,
  addressBase64: Buffer.from(address.toBytes()).toString("base64"),
  label: "Test account",
};
const authorization = { accounts: [account], selectedAccount: account, authToken: "test-authorization" };

test("restores both public keys and the selected account after serialization", async () => {
  const { cache } = loadCache();
  await cache.set(authorization);
  const restored = await cache.get();
  assert.ok(restored.selectedAccount.address instanceof PublicKey);
  assert.ok(restored.selectedAccount.publicKey instanceof PublicKey);
  assert.equal(restored.selectedAccount.address.toBase58(), address.toBase58());
  assert.equal(restored.selectedAccount, restored.accounts[0]);
  assert.equal(restored.authToken, authorization.authToken);
});

test("clears a disconnected session", async () => {
  const { cache, stored } = loadCache(JSON.stringify(authorization));
  await cache.clear();
  assert.equal(stored(), null);
  assert.equal(await cache.get(), undefined);
});

test("invalid cached data returns to the signed-out state", async () => {
  const malformed = { ...account, addressBase64: Buffer.from(new Uint8Array(31)).toString("base64") };
  for (const stored of [
    "{", "null", "{}",
    JSON.stringify({ ...authorization, accounts: [] }),
    JSON.stringify({ ...authorization, accounts: [malformed], selectedAccount: malformed }),
  ]) {
    const { cache, stored: read } = loadCache(stored);
    assert.equal(await cache.get(), undefined);
    assert.equal(read(), null);
  }
});

test("storage failures remain retryable errors", async () => {
  const { cache } = loadCache(null, true);
  await assert.rejects(cache.get(), /Storage unavailable/);
});
