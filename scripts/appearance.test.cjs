const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadTs } = require("./load-ts.cjs");

const store = new Map();
const stubs = {
  "@react-native-async-storage/async-storage": {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, value) => void store.set(key, value),
  },
};
const { parsePreference, loadPreference, savePreference } = loadTs("src/lib/appearance/preference.ts", stubs);

test("a first launch has nothing stored and follows the device setting", async () => {
  store.clear();
  assert.equal(await loadPreference(), "system");
});

test("only light and dark are ever a choice; anything else means system", () => {
  assert.equal(parsePreference("light"), "light");
  assert.equal(parsePreference("dark"), "dark");
  assert.equal(parsePreference("system"), "system");
  assert.equal(parsePreference(null), "system");
  assert.equal(parsePreference("sepia"), "system");
});

test("a chosen preference is restored on the next launch", async () => {
  store.clear();
  await savePreference("dark");
  assert.equal(await loadPreference(), "dark");
  await savePreference("system");
  assert.equal(await loadPreference(), "system");
});

test("an unreadable store falls back to the device setting instead of failing", async () => {
  const broken = loadTs("src/lib/appearance/preference.ts", { "@react-native-async-storage/async-storage": { getItem: async () => Promise.reject(new Error("storage unavailable")), setItem: async () => {} } }, new Map());
  assert.equal(await broken.loadPreference(), "system");
});
