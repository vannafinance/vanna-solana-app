const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const boundary = (message, patterns) => ({
  "no-restricted-imports": ["error", { patterns: patterns.map((group) => ({ group, message })) }],
});

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", ".expo/*", "protocol/*"] },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/theme/**/*.{ts,tsx}"],
    rules: boundary(
      "UI code must not import data or chain code. Take props; the screen wires the hook.",
      [["@/lib/*", "@/hooks/*", "**/lib/solana/*", "**/hooks/*"]],
    ),
  },
  {
    files: ["src/lib/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: boundary(
      "Data and chain code must not import UI code.",
      [["@/components/*", "@/theme/*", "**/components/*", "**/theme/*"]],
    ),
  },
]);
