#!/usr/bin/env node
// Builds the clickable web prototype of the Vanna app as ONE offline HTML file.
//
//   node prototype/build.mjs [--root <app checkout>] [--out <file.html>] [--branch <label>] [--title <text>] [--notes <file.html>]
//
//   --root    app checkout to build (its src/, assets/, app.json, node_modules). Default: the repo this folder is in.
//   --out     output file. Default: prototype/dist/Vanna-app-prototype.html
//   --branch  branch name for the "Built from" line (default: from git; useful for a detached checkout)
//   --title   heading of the control panel and page title. Default: "Vanna · app prototype"
//   --stage   working folder for the export (default prototype/.build). Give parallel builds different stages.
//   --notes   an HTML fragment shown at the top of the panel (what changed in this version), e.g. prototype/notes/v2.html
//   Navigation layout comes from the environment: EXPO_PUBLIC_NAV_LAYOUT=top-modules (see src/navigation/nav-layout.ts).
//
// Steps: make sure node_modules and the web-only dependencies are installed (without touching package.json /
// package-lock.json), stage a copy of the app in prototype/.build with a web-enabled app config and the prototype
// entry, run `expo export --platform web` with prototype/metro.config.js, inline every asset as a data URI, and wrap
// app + bundle into the control-panel page (prototype/panel).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PROTO = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(PROTO, "..");
const MAX_BYTES = 15 * 1024 * 1024;

// The web-only dependencies the Android app does not install (installed with --no-save).
const WEB_DEPS = {
  "react-native-web": "0.21.3",
  "react-dom": null, // must equal the installed react version
  "@expo/metro-runtime": null, // version expo pins in bundledNativeModules.json
};

const started = Date.now();
const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root ?? REPO);
const out = path.resolve(args.out ?? path.join(PROTO, "dist", "Vanna-app-prototype.html"));
const STAGE = args.stage ? path.resolve(args.stage) : path.join(PROTO, ".build");

function main() {
  step(`app root ${root}`);
  ensureDependencies();
  stageApp();
  exportWeb();
  const { appHtml, bundle } = inlineExport();
  const page = wrap(appHtml, bundle);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page);
  const bytes = Buffer.byteLength(page);
  step(`wrote ${out}: ${(bytes / 1024 / 1024).toFixed(2)} MB in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (bytes > MAX_BYTES) fail(`output is larger than ${MAX_BYTES / 1024 / 1024} MB`);
}

// ---------------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const usage = "usage: node prototype/build.mjs [--root <app checkout>] [--out <file.html>] [--branch <label>] [--title <text>] [--notes <file.html>]";
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const match = argv[i].match(/^--(root|out|branch|title|notes|stage)(?:=(.*))?$/);
    if (!match) fail(`unknown argument ${argv[i]}\n${usage}`);
    parsed[match[1]] = match[2] ?? argv[++i];
    if (parsed[match[1]] === undefined) fail(`--${match[1]} needs a value\n${usage}`);
  }
  return parsed;
}

function step(message) {
  console.log(`[prototype] ${message}`);
}

function fail(message) {
  console.error(`[prototype] ${message}`);
  process.exit(1);
}

/** Runs a program with an argument list (no shell). */
function run(command, commandArgs, options) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit", ...options });
  if (result.status !== 0) fail(`${command} ${commandArgs.join(" ")} failed (exit ${result.status ?? result.signal})`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function installedVersion(nodeModules, name) {
  try {
    return readJson(path.join(nodeModules, name, "package.json")).version;
  } catch {
    return null;
  }
}

function ensureDependencies() {
  const nodeModules = path.join(root, "node_modules");
  if (!fs.existsSync(path.join(nodeModules, "expo", "package.json"))) {
    step("node_modules missing: npm ci");
    run("npm", ["ci", "--no-audit", "--no-fund"], { cwd: root });
  }
  const realNodeModules = fs.realpathSync(nodeModules);
  const bundled = readJson(path.join(realNodeModules, "expo", "bundledNativeModules.json"));
  const wanted = {
    ...WEB_DEPS,
    "react-dom": installedVersion(realNodeModules, "react"),
    "@expo/metro-runtime": bundled["@expo/metro-runtime"],
  };
  const satisfied = (name, spec) => {
    const version = installedVersion(realNodeModules, name);
    if (!version) return false;
    if (/^\d/.test(spec)) return version === spec;
    // "~57.0.16" -> same major.minor
    return version.split(".").slice(0, 2).join(".") === spec.replace(/^[~^]/, "").split(".").slice(0, 2).join(".");
  };
  const missing = Object.entries(wanted).filter(([name, spec]) => !satisfied(name, spec));
  if (missing.length === 0) return;
  // Install the whole set in one go: a later `npm install --no-save` would prune packages it did not add itself.
  const specs = Object.entries(wanted).map(([name, spec]) => `${name}@${spec}`);
  step(`installing web dependencies (not saved to package.json / package-lock.json): ${specs.join(" ")}`);
  run("npm", ["install", "--no-save", "--no-audit", "--no-fund", ...specs], { cwd: path.dirname(realNodeModules) });
}

/** First node_modules folder Node / Metro find walking up from `dir`. */
function nodeModulesAbove(dir) {
  for (let current = dir; ; current = path.dirname(current)) {
    const candidate = path.join(current, "node_modules");
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
    if (path.dirname(current) === current) return null;
  }
}

function stageApp() {
  step("staging the app in prototype/.build");
  fs.rmSync(STAGE, { recursive: true, force: true });
  fs.mkdirSync(STAGE, { recursive: true });
  for (const entry of ["src", "assets", "tsconfig.json"]) {
    const from = path.join(root, entry);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(STAGE, entry), { recursive: true });
  }
  const prototypeAppConfig = require("./app-config.js");
  fs.writeFileSync(path.join(STAGE, "app.json"), JSON.stringify(prototypeAppConfig(readJson(path.join(root, "app.json"))), null, 2));
  const pkg = readJson(path.join(root, "package.json"));
  const stagedPkg = { name: pkg.name, version: pkg.version, private: true, main: "index.js", dependencies: pkg.dependencies, devDependencies: pkg.devDependencies };
  fs.writeFileSync(path.join(STAGE, "package.json"), JSON.stringify(stagedPkg, null, 2));
  // The prototype entry (prototype/index.js), with its imports pointing back at prototype/shims.
  const shimsFromStage = path.relative(STAGE, path.join(PROTO, "shims")).split(path.sep).join("/");
  const entry = fs.readFileSync(path.join(PROTO, "index.js"), "utf8").replaceAll('"./shims/', `"${shimsFromStage}/`);
  fs.writeFileSync(path.join(STAGE, "index.js"), entry);
  // Building another checkout: let the staged app see that checkout's node_modules.
  const rootNodeModules = fs.realpathSync(path.join(root, "node_modules"));
  if (nodeModulesAbove(path.dirname(STAGE)) !== rootNodeModules) fs.symlinkSync(rootNodeModules, path.join(STAGE, "node_modules"), "dir");
}

function exportWeb() {
  step("expo export --platform web");
  const cli = require.resolve("expo/bin/cli", { paths: [STAGE] });
  run(process.execPath, [cli, "export", "--platform", "web", "--output-dir", path.join(STAGE, "dist"), "--clear"], {
    cwd: STAGE,
    env: {
      ...process.env,
      EXPO_OVERRIDE_METRO_CONFIG: path.join(PROTO, "metro.config.js"),
      VN_PROTOTYPE_STAGE: STAGE,
      EXPO_NO_DOTENV: "1",
      EXPO_NO_TELEMETRY: "1",
      CI: "1",
      NODE_ENV: "production",
    },
  });
}

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Reads the export and inlines every /assets/... URL of the bundle as a data URI. */
function inlineExport() {
  const dist = path.join(STAGE, "dist");
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)];
  if (scripts.length !== 1) fail(`expected one bundle script in dist/index.html, found ${scripts.length}`);
  let bundle = fs.readFileSync(path.join(dist, scripts[0][1]), "utf8");
  bundle = bundle.replace(/(\n\/\/# (sourceMappingURL|debugId)=[^\n]*)+\s*$/, "");

  let inlined = 0;
  bundle = bundle.replace(/"(\/assets\/[^"?#]+)"/g, (literal, url) => {
    const file = path.join(dist, decodeURIComponent(url));
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime || !fs.existsSync(file)) return literal;
    inlined++;
    return JSON.stringify(`data:${mime};base64,${fs.readFileSync(file).toString("base64")}`);
  });
  const left = bundle.match(/"\/assets\/[^"]*"/g);
  if (left) fail(`assets that could not be inlined: ${left.join(", ")}`);
  step(`inlined ${inlined} assets`);

  // The app page inside the phone frame: Expo's index.html, running the bundle from the parent page.
  const frameCss = fs.readFileSync(path.join(PROTO, "panel", "app-frame.css"), "utf8").trim();
  const appHtml = html
    .replace("</head>", () => `<style>${frameCss}</style></head>`)
    .replace(scripts[0][0], () => "<script>(0, eval)(window.parent.__VN_BUNDLE)</script>");
  return { appHtml, bundle };
}

function git(...gitArgs) {
  const result = spawnSync("git", ["-C", root, ...gitArgs], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function buildInfo() {
  const sha = git("rev-parse", "--short", "HEAD") || "unknown";
  let branch = args.branch ?? git("rev-parse", "--abbrev-ref", "HEAD");
  if (!branch || branch === "HEAD") branch = git("branch", "--points-at", "HEAD", "--format=%(refname:short)").split("\n")[0] || "detached HEAD";
  const dirty = git("status", "--porcelain", "--", "src", "assets", "app.json") ? " + uncommitted changes" : "";
  const now = new Date();
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getMonth()];
  const date = `${String(now.getDate()).padStart(2, "0")} ${month} ${now.getFullYear()}`;
  return `${branch} · ${sha}${dirty} · ${date}`;
}

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// A JS string literal that is safe inside <script> (no "</script>", no "<!--").
const jsString = (text) => JSON.stringify(text).replace(/</g, "\\u003c");

function wrap(appHtml, bundle) {
  const template = fs.readFileSync(path.join(PROTO, "panel", "index.html"), "utf8");
  const control = fs.readFileSync(path.join(PROTO, "panel", "control.js"), "utf8").trimEnd();
  const info = buildInfo();
  step(`built from ${info}`);
  const scripts =
    `<script>window.__VN_APP=${jsString(appHtml)};window.__VN_BUNDLE=${jsString(bundle)};</script>\n` + `<script>\n${control}\n</script>`;
  // Function replacements: the bundle contains "$&"-like sequences that string replacements would expand.
  const title = escapeHtml(args.title ?? "Vanna · app prototype");
  const notes = args.notes ? fs.readFileSync(path.resolve(args.notes), "utf8").trim() : "";
  return template
    .replaceAll("{{TITLE}}", () => title)
    .replace("{{NOTES}}", () => notes)
    .replace("{{BUILD_INFO}}", () => escapeHtml(info))
    .replace("{{SCRIPTS}}", () => scripts);
}

main();
