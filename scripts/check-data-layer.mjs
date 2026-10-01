import { execFileSync } from "node:child_process";

const listed = execFileSync("npx", ["tsc", "-p", "tsconfig.data.json", "--listFilesOnly"], {
  encoding: "utf8",
  shell: true,
})
  .split(/\r?\n/)
  .map((line) => line.replaceAll("\\", "/"));

const leaks = listed.filter((file) => /\/src\/(components|app|theme)\//.test(file));

if (leaks.length > 0) {
  console.error("Data layer (hooks, lib, types, format) depends on UI files:");
  for (const file of leaks) console.error(`  ${file.slice(file.indexOf("/src/") + 1)}`);
  process.exit(1);
}
console.log("Data layer is independent of src/app, src/components and src/theme.");
