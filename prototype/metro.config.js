// Metro config of the prototype (web) build. build.mjs stages the app in prototype/.build and runs
// `expo export --platform web` there with EXPO_OVERRIDE_METRO_CONFIG pointing at this file.
//
// On top of Expo's default config it
//   - redirects the overridden packages / app modules to prototype/shims (overrides.js),
//   - uses babel-transformer.js (library source patches; no React Compiler for the shims),
//   - watches the folders the staged app reaches outside its own root (shims, the real node_modules).
const fs = require("fs");
const path = require("path");

const { PACKAGE_REDIRECTS, APP_REDIRECTS, SHIMS } = require("./overrides");

const stageDir = fs.realpathSync(process.env.VN_PROTOTYPE_STAGE || path.join(__dirname, ".build"));
// Resolve Expo from the staged app, i.e. from the node_modules of the app checkout being built.
const { getDefaultConfig } = require(require.resolve("expo/metro-config", { paths: [stageDir] }));

const config = getDefaultConfig(stageDir);

const nodeModulesDir = path.resolve(fs.realpathSync(require.resolve("expo/package.json", { paths: [stageDir] })), "../..");
config.watchFolders = [...new Set([...(config.watchFolders || []), path.dirname(SHIMS), nodeModulesDir])];

// babel-transformer.js wraps the transformer Expo configured (handed over through the environment, which the
// transform workers inherit).
process.env.VN_UPSTREAM_BABEL_TRANSFORMER = config.transformer.babelTransformerPath;
config.transformer.babelTransformerPath = require.resolve("./babel-transformer");

const appRedirects = new Map(Object.entries(APP_REDIRECTS).map(([relative, shim]) => [path.join(stageDir, relative), shim]));
const isShim = (file) => file.startsWith(SHIMS + path.sep);
const isBare = (name) => !name.startsWith(".") && !path.isAbsolute(name);
// Packages and "@/" app paths imported by a shim resolve as if imported by the staged app, so the shims always use
// the app's own node_modules (one copy of React, web3.js, ...), also when building another checkout (--root).
const stagedOrigin = path.join(stageDir, "index.js");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const packageShim = PACKAGE_REDIRECTS[moduleName];
  if (packageShim && context.originModulePath !== packageShim) return { type: "sourceFile", filePath: packageShim };

  const resolveFrom = isShim(context.originModulePath) && isBare(moduleName) ? { ...context, originModulePath: stagedOrigin } : context;
  const resolution = context.resolveRequest(resolveFrom, moduleName, platform);
  if (resolution.type === "sourceFile") {
    const shim = appRedirects.get(resolution.filePath);
    // A wrapper shim imports the module it wraps; that one import must reach the original.
    if (shim && context.originModulePath !== shim) return { type: "sourceFile", filePath: shim };
  }
  return resolution;
};

module.exports = config;
