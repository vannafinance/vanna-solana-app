const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const compiled = ts.transpileModule(readFileSync("src/hooks/use-wallet-connection.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function renderWallet(mobileWallet, queryClient = { cancelQueries: async () => {}, clear: () => {} }) {
  const state = [];
  let cursor = 0;
  const exports = {};
  const react = {
    useRef(initial) {
      const index = cursor++;
      state[index] ??= { current: initial };
      return state[index];
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = value; }];
    },
  };
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "react") return react;
      if (name === "@tanstack/react-query") return { useQueryClient: () => queryClient };
      if (name === "@wallet-ui/react-native-web3js") return { useMobileWallet: () => mobileWallet };
      if (name === "expo-web-browser") return { openBrowserAsync: async () => {} };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return () => {
    cursor = 0;
    return exports.useWalletConnection();
  };
}

test("connection shows the authorized address and suppresses concurrent launches", async () => {
  let resolve;
  let launches = 0;
  const wallet = {
    account: undefined,
    connect: () => {
      launches++;
      return new Promise((finish) => { resolve = finish; });
    },
  };
  const render = renderWallet(wallet);
  const connect = render().connect();
  assert.equal(render().phase, "approving");
  assert.equal(render().checking, true);
  await render().connect();
  assert.equal(launches, 1);
  wallet.account = { address: { toBase58: () => "authorized-address" } };
  resolve(wallet.account);
  await connect;
  assert.equal(render().phase, "connected");
  assert.equal(render().address, "authorized-address");
  assert.equal(render().checking, false);
});

test("missing wallet and chooser cancellation return to a usable picker", async () => {
  for (const code of ["ERROR_WALLET_NOT_FOUND", "ERROR_ASSOCIATION_CANCELLED"]) {
    const render = renderWallet({ connect: async () => { throw { code }; } });
    await render().connect();
    assert.equal(render().phase, "pick");
    assert.equal(render().walletMissing, code === "ERROR_WALLET_NOT_FOUND");
    assert.equal(render().checking, false);
  }
});

test("authorization rejection and timeout provide retryable messages", async () => {
  for (const [code, message] of [[-1, /declined/], ["ERROR_SESSION_TIMEOUT", /respond in time/]]) {
    const render = renderWallet({ connect: async () => { throw { code }; } });
    await render().connect();
    assert.equal(render().phase, "declined");
    assert.match(render().errorMessage, message);
    assert.equal(render().checking, false);
  }
});

test("disconnect does not claim success when persistent storage fails", async () => {
  const render = renderWallet({ disconnect: async () => { throw new Error("Storage unavailable"); } });
  assert.equal(await render().disconnect(), false);
  assert.match(render().errorMessage, /clear the wallet session/);
  assert.equal(render().checking, false);
});

test("logout cancels pending reads and removes cached account data", async () => {
  const calls = [];
  const wallet = { disconnect: async () => { calls.push("disconnect"); } };
  const render = renderWallet(wallet, {
    cancelQueries: async () => { calls.push("cancel"); },
    clear: () => { calls.push("clear"); },
  });
  assert.equal(await render().disconnect(), true);
  assert.deepEqual(calls, ["disconnect", "cancel", "clear"]);
  assert.equal(render().phase, "pick");
});
