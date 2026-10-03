const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

// Loads a src TypeScript module for node:test. "@/..." and relative imports resolve inside src;
// `stubs` replaces a specifier (for example "./config") with a plain object.
function loadTs(file, stubs = {}, cache = new Map()) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const compiled = ts.transpileModule(readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  cache.set(absolute, module);
  const resolve = (specifier) => {
    if (specifier in stubs) return stubs[specifier];
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const base = specifier.startsWith("@/") ? path.join("src", specifier.slice(2)) : path.join(path.dirname(absolute), specifier);
      const found = [".ts", ".tsx", "/index.ts"].map((ext) => base + ext).find(existsSync);
      return loadTs(found, stubs, cache);
    }
    return require(specifier);
  };
  runInNewContext(compiled, { module, exports: module.exports, require: resolve, BigInt, Math, Number, Uint8Array, DataView, Array, Error, RangeError, Set, Map, Promise, setTimeout, clearTimeout, setInterval, clearInterval, console, TextEncoder, Buffer, Date, URLSearchParams, fetch, AbortController });
  return module.exports;
}

module.exports = { loadTs };
