// Babel transformer for the prototype build: Expo's transformer plus
//   - the library source patches from overrides.js (applied before Babel), and
//   - no React Compiler for the shims (they are plain browser glue, compiled as written; the app's own code still
//     goes through the compiler exactly like the Android build).
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Set by metro.config.js to the transformer of the app's own @expo/metro-config.
const upstream = require(process.env.VN_UPSTREAM_BABEL_TRANSFORMER || "@expo/metro-config/build/babel-transformer");
const { patchSource, isShim } = require("./overrides");

function transform(args) {
  const { filename, options } = args;
  const absolute = path.resolve(options.projectRoot, filename);
  const src = patchSource(absolute, args.src);
  const transformOptions = isShim(absolute)
    ? { ...options, customTransformOptions: { ...options.customTransformOptions, reactCompiler: false } }
    : options;
  return upstream.transform({ ...args, src, options: transformOptions });
}

function getCacheKey(options) {
  const own = crypto.createHash("sha1");
  for (const file of [__filename, path.join(__dirname, "overrides.js")]) own.update(fs.readFileSync(file));
  return [upstream.getCacheKey ? upstream.getCacheKey(options) : "", own.digest("hex")].join(":");
}

module.exports = { transform, getCacheKey };
