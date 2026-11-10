// Downloads Dynamic's Android AARs (not on Maven) into ../android/libs.
// Usage: node modules/vanna-dynamic/scripts/fetch-android-sdk.mjs [tag]   (default tag below)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tag = process.argv[2] ?? '1.7.1';
const libs = join(dirname(fileURLToPath(import.meta.url)), '..', 'android', 'libs');
const base = `https://github.com/dynamic-labs-oss/android-sdk-and-sample-app/raw/refs/tags/${tag}`;
await mkdir(libs, { recursive: true });
for (const name of ['dynamic-sdk-android.aar', 'solana-web3.aar']) {
  const res = await fetch(`${base}/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${base}`);
  await writeFile(join(libs, name), Buffer.from(await res.arrayBuffer()));
  console.log(`saved ${name}`);
}
